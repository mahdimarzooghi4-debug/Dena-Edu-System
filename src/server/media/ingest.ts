import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courses, mediaIngests, mediaMultipartPlans, mediaProcessingJobs, memberships, privateMediaAssets, supervisionGrants,
} from "../../db/schema";
import { configuredPrivateMediaOrigin } from "../student/private-media";
import {
  verifyProcessedObject, verifyProcessedStream, verifyQuarantineStream,
  verifyProcessingAttestation, type ProcessingAttestation,
} from "./multipart";

export const MAX_PILOT_UPLOAD_BYTES = 8 * 1024 * 1024;

export function ingestAvailable(): boolean {
  return process.env.DENA_INGEST_ENABLED === "1" &&
    configuredPrivateMediaOrigin() !== null;
}

export function isValidMp4Header(bytes: Buffer): boolean {
  // First box must be ISO-BMFF ftyp; not a codec/transcode/malware verdict.
  return bytes.length >= 16 && bytes.readUInt32BE(0) >= 16 &&
    bytes.readUInt32BE(0) <= bytes.length &&
    bytes.toString("ascii", 4, 8) === "ftyp" &&
    /^[a-zA-Z0-9 ]{4}$/.test(bytes.toString("ascii", 8, 12));
}

export function secureWorkerToken(value: string | null): boolean {
  const secret = process.env.DENA_MEDIA_PROCESSOR_TOKEN;
  if (process.env.DENA_MEDIA_PROCESSOR_ENABLED !== "1" ||
      !secret || secret.length < 32 ||
      secret === process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN ||
      !value?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length &&
    timingSafeEqual(provided, expected);
}

export type IngestInput = {
  title: string; clientRequestId: string; expectedBytes: number;
  sha256: string;
};

export type IngestIssue = "not_available" | "not_provider" | "conflict" | "limit_reached";
export class IngestError extends Error {
  constructor(readonly kind: IngestIssue) { super(kind); }
}

/** No user-provided file keys or URLs. DB serializes course quota and retries.
 * Provider must hold the course scope, have an approved independent institute
 * decision, and upload only BEFORE course publication.
 */
export async function reserveIngest(userId: string, courseId: string, input: IngestInput) {
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course || course.publicationStatus !== "draft") {
      throw new IngestError("not_available");
    }
    const [provider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, userId),
        eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!provider) throw new IngestError("not_provider");
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) {
      throw new IngestError("not_available");
    }
    const [approver] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.responsibleInstituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!approver) throw new IngestError("not_available");

    const [prior] = await tx.select().from(mediaIngests).where(and(
      eq(mediaIngests.courseId, courseId),
      eq(mediaIngests.requestId, input.clientRequestId),
    )).limit(1);
    if (prior) {
      if (prior.createdByUserId !== userId || prior.title !== input.title ||
          prior.expectedBytes !== input.expectedBytes ||
          prior.expectedSha256 !== input.sha256) throw new IngestError("conflict");
      return { uploadId: prior.id, assetId: prior.assetId, status: prior.status,
        replayed: true };
    }

    const [planConflict] = await tx.select({ id: mediaMultipartPlans.id })
      .from(mediaMultipartPlans).where(and(
        eq(mediaMultipartPlans.courseId, courseId),
        eq(mediaMultipartPlans.requestId, input.clientRequestId),
      )).limit(1);
    if (planConflict) throw new IngestError("conflict");
    await tx.update(mediaMultipartPlans).set({ status: "expired" }).where(and(
      eq(mediaMultipartPlans.courseId, courseId),
      eq(mediaMultipartPlans.status, "planned"),
      sql`${mediaMultipartPlans.expiresAt} <= now()`,
    ));
    const [{ count }] = await tx.select({
      count: sql<number>`count(*)::int`,
    }).from(mediaIngests).where(eq(mediaIngests.courseId, courseId));
    const [{ planned }] = await tx.select({
      planned: sql<number>`count(*)::int`,
    }).from(mediaMultipartPlans).where(and(
      eq(mediaMultipartPlans.courseId, courseId),
      eq(mediaMultipartPlans.status, "planned"),
    ));
    if (count + planned >= 20) throw new IngestError("limit_reached");
    const [created] = await tx.insert(mediaIngests).values({
      courseId, providerId: course.providerId, createdByUserId: userId,
      requestId: input.clientRequestId, title: input.title,
      expectedBytes: input.expectedBytes, expectedSha256: input.sha256,
    }).returning({ id: mediaIngests.id, assetId: mediaIngests.assetId });
    return { uploadId: created.id, assetId: created.assetId,
      status: "reserved" as const, replayed: false };
  });
}

async function rejectFailedIngest(uploadId: string, reason: string) {
  await getDb().update(mediaIngests).set({
    status: "rejected", rejectionReason: reason, completedAt: new Date(),
  }).where(and(eq(mediaIngests.id, uploadId),
    eq(mediaIngests.status, "uploading")));
}

/** Fixed 8-MiB memory-bound PILOT proxy. Does not turn input into ready media;
 * output remains quarantined until the independent worker attestation.
 */
export async function receiveQuarantinedUpload(
  userId: string, courseId: string, uploadId: string,
  request: Request,
): Promise<"quarantined" | "not_found" | "invalid" | "conflict" | "unavailable"> {
  if (!ingestAvailable()) return "unavailable";
  const length = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length < 16 ||
      length > MAX_PILOT_UPLOAD_BYTES ||
      request.headers.get("content-type") !== "video/mp4") return "invalid";
  const db = getDb();
  // The reservation may outlive a provider's role, a course's draft state or
  // institute approval. Re-check those facts and claim the upload atomically.
  const intent = await db.transaction(async (tx) => {
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course || course.publicationStatus !== "draft") return "not_found" as const;
    const [job] = await tx.select().from(mediaIngests).where(and(
      eq(mediaIngests.id, uploadId), eq(mediaIngests.courseId, courseId),
      eq(mediaIngests.createdByUserId, userId),
      eq(mediaIngests.providerId, course.providerId),
    )).limit(1).for("update");
    if (!job) return "not_found" as const;
    if (job.status !== "reserved") return "conflict" as const;
    if (length !== job.expectedBytes) return "invalid" as const;
    const [provider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, userId),
        eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    const [grant] = await tx.select().from(supervisionGrants)
      .where(and(
        eq(supervisionGrants.courseId, courseId),
        eq(supervisionGrants.providerId, course.providerId),
        eq(supervisionGrants.instituteId, course.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
      )).limit(1).for("share");
    if (!provider || !grant?.approvedByInstituteUserId || !grant.approvedAt) {
      return "not_found" as const;
    }
    const [approver] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.responsibleInstituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!approver) return "not_found" as const;
    await tx.update(mediaIngests).set({ status: "uploading" })
      .where(eq(mediaIngests.id, uploadId));
    return job;
  });
  if (typeof intent === "string") return intent;
  let failure = "upload_failed";
  try {
    const reader = request.body?.getReader();
    if (!reader) { failure = "empty_file"; return "invalid"; }
    const chunks: Buffer[] = [];
    let count = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      count += part.value.byteLength;
      if (count > length || count > MAX_PILOT_UPLOAD_BYTES) {
        await reader.cancel(); failure = "size_mismatch"; return "invalid";
      }
      chunks.push(Buffer.from(part.value));
    }
    const bytes = Buffer.concat(chunks);
    if (count !== length || !isValidMp4Header(bytes)) {
      failure = "invalid_mp4_header"; return "invalid";
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== intent.expectedSha256) {
      failure = "sha_mismatch"; return "invalid";
    }
    const media = configuredPrivateMediaOrigin();
    if (!media) return "unavailable";
    const upstream = await fetch(
      new URL(`/quarantine/${uploadId}`, media.origin), {
        method: "PUT", redirect: "error", cache: "no-store",
        headers: { Authorization: `Bearer ${media.token}`,
          "Content-Type": "video/mp4", "X-Dena-Sha256": digest },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (upstream.status !== 201) {
      await upstream.body?.cancel(); return "unavailable";
    }
    await upstream.body?.cancel();
    return await db.transaction(async (tx) => {
      const [updated] = await tx.update(mediaIngests).set({
        status: "quarantined", uploadedAt: new Date(),
      }).where(and(eq(mediaIngests.id, uploadId),
        eq(mediaIngests.status, "uploading")))
        .returning({ id: mediaIngests.id });
      if (!updated) return "conflict" as const;
      await tx.insert(mediaProcessingJobs).values({ uploadId })
        .onConflictDoNothing();
      return "quarantined" as const;
    });
  } catch {
    return "unavailable";
  } finally {
    // No partial upload may be published even if storage/network fails.
    await rejectFailedIngest(uploadId, failure);
  }
}

/** Worker notification is only a TRIGGER: Dena independently fetches the
 * private origin's inspection attestation and checks the final MP4 location.
 * The worker's request body can never assert clean/transcoded/ready itself.
 */
/** GET actual private bytes, not just HEAD metadata. Cancellation stops
 * reading immediately on any mismatch and on overlong streams.
 * null = transport unavailable; false = invalid bytes/metadata.
 */
async function verifyOriginBytes(
  origin: URL, token: string, path: string,
  expected: { key: string; bytes: number; sha256: string },
  sourceUploadId?: string,
): Promise<boolean | null> {
  const response = await fetch(new URL(path, origin), {
    method: "GET", redirect: "error", cache: "no-store",
    headers: { Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!response || response.status !== 200 || !response.body) {
    await response?.body?.cancel().catch(() => {});
    return null;
  }
  if (Number(response.headers.get("content-length")) !== expected.bytes ||
      response.headers.get("x-dena-private") !== "1" ||
      response.headers.get("content-type")?.split(";")[0].trim() !== "video/mp4") {
    await response.body.cancel().catch(() => {});
    return false;
  }
  const reader = response.body.getReader();
  async function* chunks(): AsyncGenerator<Uint8Array> {
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        yield next.value;
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  const object = {
    key: expected.key, private: true, contentType: "video/mp4",
    stream: chunks(),
  };
  return sourceUploadId
    ? verifyQuarantineStream(sourceUploadId, expected.bytes, expected.sha256, object)
    : verifyProcessedStream(expected, object);
}

export async function completeAttestedIngest(uploadId: string, leaseToken: string) {
  const media = configuredPrivateMediaOrigin();
  const signingKey = process.env.DENA_MEDIA_ATTESTATION_HMAC_KEY;
  const keyId = process.env.DENA_MEDIA_ATTESTATION_KEY_ID;
  if (!media || process.env.DENA_MEDIA_PROCESSOR_ENABLED !== "1" ||
      process.env.DENA_MEDIA_ATTESTATION_ENABLED !== "1" ||
      !signingKey || signingKey.length < 32 ||
      !keyId || !/^[a-zA-Z0-9._-]{3,100}$/.test(keyId) ||
      signingKey === media.token ||
      signingKey === process.env.DENA_MEDIA_PROCESSOR_TOKEN ||
      process.env.DENA_MEDIA_PROCESSOR_TOKEN === media.token) {
    return "unavailable" as const;
  }
  // Preflight without database locks. Never start private I/O for an unknown
  // job or a callback not holding the live processing lease. All facts below
  // are checked AGAIN, with locks, immediately before committing "ready".
  const db = getDb();
  const [initial] = await db.select().from(mediaIngests)
    .where(eq(mediaIngests.id, uploadId)).limit(1);
  if (!initial) return "not_found" as const;
  if (initial.status === "ready") return "ready" as const;
  if (initial.status !== "quarantined") return "conflict" as const;
  const [initialLease] = await db.select().from(mediaProcessingJobs)
    .where(eq(mediaProcessingJobs.uploadId, uploadId)).limit(1);
  if (!initialLease || initialLease.status !== "leased" ||
      initialLease.leaseToken !== leaseToken ||
      !initialLease.leaseUntil || initialLease.leaseUntil <= new Date()) {
    return "conflict" as const;
  }

  const inspection = await fetch(
    new URL(`/inspection/${uploadId}`, media.origin), {
      headers: { Authorization: `Bearer ${media.token}` },
      redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  ).catch(() => null);
  if (!inspection || inspection.status !== 200) {
    await inspection?.body?.cancel(); return "unavailable" as const;
  }
  const rawReport: unknown = await inspection.json().catch(() => null);
  const assetKey = `${initial.courseId}/${initial.assetId}.mp4`;
  // The origin supplies bytes but does NOT get to attest them in production.
  // Only a distinct isolated scanner's signing key may create this report.
  const report = rawReport as ProcessingAttestation;
  if (!verifyProcessingAttestation(report, {
    keyId, uploadId, sourceBytes: initial.expectedBytes,
    sourceSha256: initial.expectedSha256, outputKey: assetKey,
  }, signingKey)) return "conflict" as const;
  // Re-read CURRENT quarantine bytes independently of a signed report.
  // A valid report cannot cover subsequently replaced or corrupted bytes.
  const sourceVerified = await verifyOriginBytes(
    media.origin, media.token, "/quarantine/" + uploadId, {
      key: "quarantine/" + uploadId,
      bytes: initial.expectedBytes, sha256: initial.expectedSha256,
    }, uploadId,
  );
  if (sourceVerified === null) return "unavailable" as const;
  if (!sourceVerified) return "conflict" as const;
  const head = await fetch(new URL(`/private/${assetKey}`, media.origin), {
    method: "HEAD", redirect: "error", cache: "no-store",
    headers: { Authorization: `Bearer ${media.token}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!head || head.status !== 200) {
    await head?.body?.cancel();
    return "unavailable" as const;
  }
  const stored = {
    key: assetKey,
    bytes: Number(head.headers.get("content-length")),
    sha256: head.headers.get("x-dena-sha256") ?? "",
    contentType: head.headers.get("content-type")?.split(";")[0].trim() ?? "",
    private: head.headers.get("x-dena-private") === "1",
  };
  await head.body?.cancel();
  if (!verifyProcessedObject(report, stored)) return "conflict" as const;
  // HEAD/ETag is NOT independent proof of final output integrity.
  const outputVerified = await verifyOriginBytes(
    media.origin, media.token, "/private/" + assetKey, {
      key: assetKey, bytes: report.outputBytes, sha256: report.outputSha256,
    },
  );
  if (outputVerified === null) return "unavailable" as const;
  if (!outputVerified) return "conflict" as const;

  return db.transaction(async (tx) => {
    const [job] = await tx.select().from(mediaIngests)
      .where(eq(mediaIngests.id, uploadId)).limit(1).for("update");
    if (!job) return "not_found" as const;
    if (job.status === "ready") return "ready" as const;
    if (job.status !== "quarantined") return "conflict" as const;
    // Fencing: callback credentials alone are insufficient. The caller must
    // own the live DB lease. Late retries cannot publish an orphaned output.
    const [leased] = await tx.select().from(mediaProcessingJobs)
      .where(eq(mediaProcessingJobs.uploadId, uploadId))
      .limit(1).for("update");
    if (!leased || leased.status !== "leased" ||
        leased.leaseToken !== leaseToken ||
        !leased.leaseUntil || leased.leaseUntil <= new Date()) {
      return "conflict" as const;
    }
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, job.courseId)).limit(1).for("share");
    const [grant] = await tx.select().from(supervisionGrants)
      .where(and(eq(supervisionGrants.courseId, job.courseId),
        eq(supervisionGrants.providerId, job.providerId),
        eq(supervisionGrants.status, "approved")))
      .limit(1).for("share");
    if (!course || course.publicationStatus !== "draft" ||
        !grant?.approvedByInstituteUserId || !grant.approvedAt ||
        course.providerId !== job.providerId ||
        grant.instituteId !== course.responsibleInstituteId) return "conflict" as const;
    const [provider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, job.createdByUserId),
        eq(memberships.providerId, job.providerId),
        eq(memberships.role, "provider"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    const [approver] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.instituteId, course.responsibleInstituteId),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!provider || !approver) return "conflict" as const;

    // The initial unauthenticated reads are advisory. The row lock, live lease,
    // active provider, institute grant/approver and draft publication status
    // are all authoritative here. Never publish on a stale verification.
    if (job.assetId !== initial.assetId ||
        job.courseId !== initial.courseId ||
        job.providerId !== initial.providerId ||
        job.createdByUserId !== initial.createdByUserId ||
        job.expectedBytes !== initial.expectedBytes ||
        job.expectedSha256 !== initial.expectedSha256) return "conflict" as const;
    if (!verifyProcessingAttestation(report, {
      keyId, uploadId, sourceBytes: job.expectedBytes,
      sourceSha256: job.expectedSha256,
      outputKey: job.courseId + "/" + job.assetId + ".mp4",
    }, signingKey)) return "conflict" as const;
    // A lease may have expired during slow private GETs, without another
    // callback changing the row: recheck wall time at commit.
    if (!leased.leaseUntil || leased.leaseUntil <= new Date()) {
      return "conflict" as const;
    }
    await tx.insert(privateMediaAssets).values({
      id: job.assetId, courseId: job.courseId, title: job.title,
      objectKey: assetKey, status: "ready",
    });
    await tx.update(mediaIngests).set({
      status: "ready", completedAt: new Date(),
    }).where(eq(mediaIngests.id, uploadId));
    await tx.update(mediaProcessingJobs).set({
      status: "done", leaseToken: null, leaseUntil: null, updatedAt: new Date(),
    }).where(and(eq(mediaProcessingJobs.uploadId, uploadId),
      eq(mediaProcessingJobs.leaseToken, leaseToken),
      eq(mediaProcessingJobs.status, "leased")));
    return "ready" as const;
  });
}
