import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { mediaIngests, mediaProcessingJobs } from "../../db/schema";

export const MAX_PROCESSING_ATTEMPTS = 5;
export const PROCESSING_LEASE_SECONDS = 300;
export function retryDelaySeconds(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("invalid attempt");
  return Math.min(3600, 30 * 2 ** Math.min(attempt - 1, 16));
}

/** Durable PostgreSQL claim. SKIP LOCKED allows parallel workers without
 * leasing the same upload twice; expired leases become eligible again.
 * Only call from independently authenticated internal worker routes.
 */
export async function leaseProcessingJobs(limit = 5) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error("invalid claim limit");
  }
  const rows = await getDb().execute(sql`
    WITH picked AS (
      SELECT upload_id FROM dena_media_processing_jobs
      WHERE (
        (status = 'queued' AND next_attempt_at <= now())
        OR (status = 'leased' AND lease_until <= now())
      ) AND attempts < ${MAX_PROCESSING_ATTEMPTS}
      ORDER BY next_attempt_at, upload_id
      FOR UPDATE SKIP LOCKED LIMIT ${limit}
    )
    UPDATE dena_media_processing_jobs AS jobs
    SET status = 'leased', attempts = attempts + 1,
        lease_token = gen_random_uuid(),
        lease_until = now() + interval '5 minutes',
        updated_at = now()
    FROM picked
    WHERE jobs.upload_id = picked.upload_id
    RETURNING jobs.upload_id, jobs.lease_token, jobs.attempts
  `);
  return rows.map((row) => ({
    uploadId: String(row.upload_id), leaseToken: String(row.lease_token),
    attempts: Number(row.attempts),
  }));
}

/** A worker must present the CURRENT lease token. Old/late retries cannot
 * reschedule a job claimed by a different worker.
 */
export async function failProcessingJob(
  uploadId: string, leaseToken: string, reason: string,
): Promise<"queued" | "dead" | "conflict"> {
  if (reason.length < 3 || reason.length > 500) throw new Error("invalid reason");
  return getDb().transaction(async (tx) => {
    const [job] = await tx.select().from(mediaProcessingJobs).where(and(
      eq(mediaProcessingJobs.uploadId, uploadId),
      eq(mediaProcessingJobs.leaseToken, leaseToken),
      eq(mediaProcessingJobs.status, "leased"),
      sql`${mediaProcessingJobs.leaseUntil} > now()`,
    )).for("update").limit(1);
    if (!job) return "conflict" as const;
    const dead = job.attempts >= MAX_PROCESSING_ATTEMPTS;
    await tx.update(mediaProcessingJobs).set({
      status: dead ? "dead" : "queued",
      leaseToken: null, leaseUntil: null, lastError: reason,
      nextAttemptAt: new Date(Date.now() + retryDelaySeconds(job.attempts) * 1000),
      updatedAt: new Date(),
    }).where(eq(mediaProcessingJobs.uploadId, uploadId));
    return dead ? "dead" as const : "queued" as const;
  });
}

/** Reclaim fully exhausted crashed leases as dead-letter entries. The
 * quarantine file remains PRIVATE pending explicit authenticated cleanup.
 */
export async function deadLetterExpiredLeases() {
  return getDb().update(mediaProcessingJobs).set({
    status: "dead", leaseToken: null, leaseUntil: null,
    lastError: "lease_expired_max_attempts", updatedAt: new Date(),
  }).where(and(
    eq(mediaProcessingJobs.status, "leased"),
    sql`${mediaProcessingJobs.leaseUntil} <= now()`,
    sql`${mediaProcessingJobs.attempts} >= ${MAX_PROCESSING_ATTEMPTS}`,
  )).returning({ uploadId: mediaProcessingJobs.uploadId });
}

/** Metadata reaper only: returns IDs for a future private-store abort/delete
 * adapter. It NEVER asserts that an object was deleted.
 */
export async function abandonStalePilotUploads() {
  return getDb().update(mediaIngests).set({
    status: "rejected", rejectionReason: "stale_upload",
    completedAt: new Date(),
  }).where(and(
    sql`${mediaIngests.status} IN ('reserved', 'uploading')`,
    sql`${mediaIngests.createdAt} < now() - interval '24 hours'`,
  )).returning({ uploadId: mediaIngests.id });
}
