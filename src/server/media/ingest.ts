import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courses, mediaIngests, memberships, privateMediaAssets, supervisionGrants,
} from "../../db/schema";
import { configuredPrivateMediaOrigin } from "../student/private-media";

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
      !secret || secret.length < 32 || !value?.startsWith("Bearer ")) return false;
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

    const [{ count }] = await tx.select({
      count: sql<number>`count(*)::int`,
    }).from(mediaIngests).where(eq(mediaIngests.courseId, courseId));
    if (count >= 20) throw new IngestError("limit_reached");
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
    const [updated] = await db.update(mediaIngests).set({
      status: "quarantined", uploadedAt: new Date(),
    }).where(and(eq(mediaIngests.id, uploadId),
      eq(mediaIngests.status, "uploading")))
      .returning({ id: mediaIngests.id });
    return updated ? "quarantined" : "conflict";
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
export async function completeAttestedIngest(uploadId: string) {
  const media = configuredPrivateMediaOrigin();
  if (!media || process.env.DENA_MEDIA_PROCESSOR_ENABLED !== "1") {
    return "unavailable" as const;
  }
  return getDb().transaction(async (tx) => {
    const [job] = await tx.select().from(mediaIngests)
      .where(eq(mediaIngests.id, uploadId)).limit(1).for("update");
    if (!job) return "not_found" as const;
    if (job.status === "ready") return "ready" as const;
    if (job.status !== "quarantined") return "conflict" as const;
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
    const report: unknown = await inspection.json().catch(() => null);
    const assetKey = `${job.courseId}/${job.assetId}.mp4`;
    if (typeof report !== "object" || report === null ||
        !("sha256" in report) || report.sha256 !== job.expectedSha256 ||
        !("bytes" in report) || report.bytes !== job.expectedBytes ||
        !("malware" in report) || report.malware !== "clean" ||
        !("transcoded" in report) || report.transcoded !== true ||
        !("format" in report) || report.format !== "mp4" ||
        !("assetKey" in report) || report.assetKey !== assetKey) {
      return "conflict" as const;
    }
    const head = await fetch(new URL(`/private/${assetKey}`, media.origin), {
      method: "HEAD", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${media.token}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!head || head.status !== 200 ||
        head.headers.get("content-type")?.split(";")[0] !== "video/mp4") {
      await head?.body?.cancel();
      return "unavailable" as const;
    }
    await head.body?.cancel();
    await tx.insert(privateMediaAssets).values({
      id: job.assetId, courseId: job.courseId, title: job.title,
      objectKey: assetKey, status: "ready",
    });
    await tx.update(mediaIngests).set({
      status: "ready", completedAt: new Date(),
    }).where(eq(mediaIngests.id, uploadId));
    return "ready" as const;
  });
}
