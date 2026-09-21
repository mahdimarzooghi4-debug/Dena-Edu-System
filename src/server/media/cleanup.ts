import { timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { mediaCleanupJobs } from "../../db/schema";
import { configuredPrivateMediaOrigin } from "../student/private-media";

const MAX_ATTEMPTS = 5;
export const CLEANUP_LEASE_SECONDS = 120;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

export function secureCleanupToken(authorization: string | null): boolean {
  const token = process.env.DENA_MEDIA_CLEANUP_TOKEN;
  if (process.env.DENA_MEDIA_CLEANUP_ENABLED !== "1" ||
      !token || token.length < 32 ||
      token === process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN ||
      token === process.env.DENA_MEDIA_PROCESSOR_TOKEN ||
      token === process.env.DENA_MEDIA_ATTESTATION_HMAC_KEY ||
      !authorization?.startsWith("Bearer ")) return false;
  const a = Buffer.from(authorization.slice(7)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cleanupDelaySeconds(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > MAX_ATTEMPTS) {
    throw new Error("invalid attempt");
  }
  return Math.min(3600, 60 * 2 ** (attempt - 1));
}

/** A repeatable, atomic sweep. Never targets ready ingests or private MP4s.
 * Uploading is deliberately NOT reaped: an in-flight proxy transfer can still
 * write to the origin. The operational storage adapter must fence uploads.
 */
export async function enqueueCleanupCandidates(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error("invalid limit");
  }
  return getDb().transaction(async (tx) => {
    // Turn only 24h-old RESERVED intents into terminal rejected records.
    // Their upload endpoint will no longer accept a new transfer.
    const stale = await tx.execute(sql`
      SELECT id FROM dena_media_ingests
      WHERE status = 'reserved' AND created_at < now() - interval '24 hours'
      ORDER BY created_at, id
      FOR UPDATE SKIP LOCKED LIMIT ${limit}
    `);
    for (const row of stale) {
      await tx.execute(sql`
        UPDATE dena_media_ingests SET status = 'rejected',
          rejection_reason = 'reservation_expired', completed_at = now()
        WHERE id = ${row.id} AND status = 'reserved'
      `);
    }
    // Quarantine may be deleted only once the processing queue is terminal
    // and the one-hour grace period has elapsed. Lock the ingest to exclude
    // a concurrent completion transaction, then refuse all ready assets.
    const dead = await tx.execute(sql`
      SELECT i.id FROM dena_media_ingests i
      JOIN dena_media_processing_jobs p ON p.upload_id = i.id
      WHERE i.status = 'quarantined' AND p.status = 'dead'
        AND p.updated_at < now() - interval '1 hour'
      ORDER BY p.updated_at, i.id
      FOR UPDATE OF i SKIP LOCKED LIMIT ${limit}
    `);
    for (const row of dead) {
      await tx.execute(sql`
        UPDATE dena_media_ingests SET status = 'rejected',
          rejection_reason = 'processing_dead_letter', completed_at = now()
        WHERE id = ${row.id} AND status = 'quarantined'
      `);
    }
    // Rejected transfers get a one-hour grace period before external deletion;
    // reserved intent expiration has no bytes and is still safe/idempotent.
    const candidates = await tx.execute(sql`
      SELECT i.id FROM dena_media_ingests i
      WHERE i.status = 'rejected'
        AND i.completed_at < now() - interval '1 hour'
        AND NOT EXISTS (
          SELECT 1 FROM dena_private_media_assets a WHERE a.id = i.asset_id
        )
      ORDER BY i.completed_at, i.id
      FOR UPDATE OF i SKIP LOCKED LIMIT ${limit}
    `);
    let queued = 0;
    for (const row of candidates) {
      const created = await tx.insert(mediaCleanupJobs)
        .values({ uploadId: String(row.id) })
        .onConflictDoNothing()
        .returning({ uploadId: mediaCleanupJobs.uploadId });
      queued += created.length;
    }
    return { expired: stale.length, deadLettered: dead.length, queued };
  });
}

export async function claimCleanupJobs(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error("invalid limit");
  }
  // Crashed workers at the fifth attempt must not be reclaimed indefinitely.
  await getDb().execute(sql`
    UPDATE dena_media_cleanup_jobs
    SET status = 'dead', lease_token = NULL, lease_until = NULL,
        last_error = 'lease_expired_max_attempts'
    WHERE status = 'leased' AND lease_until <= now()
      AND attempts >= ${MAX_ATTEMPTS}
  `);
  const rows = await getDb().execute(sql`
    WITH picked AS (
      SELECT upload_id FROM dena_media_cleanup_jobs
      WHERE ((status = 'pending' AND next_attempt_at <= now())
         OR (status = 'leased' AND lease_until <= now()))
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY next_attempt_at, upload_id
      FOR UPDATE SKIP LOCKED LIMIT ${limit}
    )
    UPDATE dena_media_cleanup_jobs AS jobs
    SET status = 'leased', attempts = attempts + 1,
        lease_token = gen_random_uuid(),
        lease_until = now() + interval '2 minutes'
    FROM picked WHERE jobs.upload_id = picked.upload_id
    RETURNING jobs.upload_id, jobs.lease_token, jobs.attempts
  `);
  return rows.map(row => ({
    uploadId: String(row.upload_id), leaseToken: String(row.lease_token),
    attempts: Number(row.attempts),
  }));
}

/** A failed DELETE must never be recorded as completed. 404 is idempotent
 * success; other status, timeout or thrown fetch queues a bounded retry.
 */
export async function finishCleanupJob(
  uploadId: string, leaseToken: string, ok: boolean, reason = "origin_unavailable",
) {
  if (!uuid.test(uploadId) || !uuid.test(leaseToken) ||
      (!ok && (reason.length < 3 || reason.length > 100))) {
    throw new Error("invalid cleanup completion");
  }
  return getDb().transaction(async tx => {
    const [job] = await tx.select().from(mediaCleanupJobs).where(and(
      eq(mediaCleanupJobs.uploadId, uploadId),
      eq(mediaCleanupJobs.leaseToken, leaseToken),
      eq(mediaCleanupJobs.status, "leased"),
      sql`${mediaCleanupJobs.leaseUntil} > now()`,
    )).for("update").limit(1);
    if (!job) return "conflict" as const;
    const dead = !ok && job.attempts >= MAX_ATTEMPTS;
    const status = ok ? "done" : dead ? "dead" : "pending";
    await tx.update(mediaCleanupJobs).set({
      status, leaseToken: null, leaseUntil: null,
      completedAt: ok ? new Date() : null,
      lastError: ok ? null : reason,
      nextAttemptAt: ok ? job.nextAttemptAt
        : new Date(Date.now() + cleanupDelaySeconds(job.attempts) * 1000),
    }).where(eq(mediaCleanupJobs.uploadId, uploadId));
    return status;
  });
}

export async function runQuarantineCleanup(limit: number) {
  const media = configuredPrivateMediaOrigin();
  if (process.env.DENA_MEDIA_CLEANUP_ENABLED !== "1" || !media) {
    return null;
  }
  const sweep = await enqueueCleanupCandidates(limit);
  const claimed = await claimCleanupJobs(limit);
  const results: { uploadId: string; status: string }[] = [];
  for (const job of claimed) {
    // Ids come ONLY from server DB rows; never accept arbitrary URL/key/path.
    let response: Response | null = null;
    try {
      response = await fetch(new URL(`/quarantine/${job.uploadId}`, media.origin), {
        method: "DELETE", redirect: "error", cache: "no-store",
        headers: { Authorization: `Bearer ${media.token}` },
        signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel();
    } catch { /* retry by durable job */ }
    const ok = response?.status === 204 || response?.status === 404;
    const state = await finishCleanupJob(job.uploadId, job.leaseToken, ok);
    results.push({ uploadId: job.uploadId, status: state });
  }
  return { ...sweep, claimed: claimed.length, results };
}
