import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { courses, mediaIngests, mediaMultipartPlans, memberships, supervisionGrants } from "../../db/schema";
import { MAX_MULTIPART_BYTES, MULTIPART_PART_BYTES, planMultipart } from "./multipart";
import { IngestError, type IngestInput } from "./ingest";

/** Purely inert control-plane switch: even when enabled this MUST NOT grant
 * direct upload, create storage sessions or accept arbitrary client keys.
 */
export const MIN_MULTIPART_BYTES = MULTIPART_PART_BYTES + 1;
export const MULTIPART_PLAN_LIFETIME_MS = 24 * 60 * 60 * 1000;
export function multipartPlanningEnabled() {
  return process.env.DENA_MULTIPART_PLANNING_ENABLED === "1";
}

export async function reserveMultipartPlan(userId: string, courseId: string, input: IngestInput) {
  if (!multipartPlanningEnabled()) throw new IngestError("not_available");
  if (!Number.isSafeInteger(input.expectedBytes) ||
      input.expectedBytes < MIN_MULTIPART_BYTES ||
      input.expectedBytes > MAX_MULTIPART_BYTES) throw new IngestError("not_available");
  return getDb().transaction(async tx => {
    // Shared course row lock serializes both the pilot and dry-run quota.
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course || course.publicationStatus !== "draft") {
      throw new IngestError("not_available");
    }
    const [provider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(eq(memberships.userId, userId),
        eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId),
        eq(memberships.status, "active"))).limit(1).for("share");
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
    // Expire stale metadata under the same course lock. NEVER silently retry a
    // previously expired requestId: explicit new idempotency ID is required.
    await tx.update(mediaMultipartPlans).set({ status: "expired" }).where(and(
      eq(mediaMultipartPlans.courseId, courseId),
      eq(mediaMultipartPlans.status, "planned"),
      sql`${mediaMultipartPlans.expiresAt} <= now()`,
    ));
    const [prior] = await tx.select().from(mediaMultipartPlans).where(and(
      eq(mediaMultipartPlans.courseId, courseId),
      eq(mediaMultipartPlans.requestId, input.clientRequestId),
    )).limit(1);
    if (prior) {
      if (prior.createdByUserId !== userId || prior.title !== input.title ||
          prior.expectedBytes !== input.expectedBytes ||
          prior.expectedSha256 !== input.sha256) throw new IngestError("conflict");
      return {
        uploadId: prior.id, status: prior.status, replayed: true,
        expiresAt: prior.expiresAt,
        plan: prior.status === "planned"
          ? planMultipart(prior.id, prior.expectedBytes) : null,
      };
    }
    const [pilotConflict] = await tx.select({ id: mediaIngests.id })
      .from(mediaIngests).where(and(
        eq(mediaIngests.courseId, courseId),
        eq(mediaIngests.requestId, input.clientRequestId),
      )).limit(1);
    if (pilotConflict) throw new IngestError("conflict");
    const [{ count }] = await tx.select({
      count: sql<number>`count(*)::int`,
    }).from(mediaMultipartPlans).where(and(
      eq(mediaMultipartPlans.courseId, courseId),
      eq(mediaMultipartPlans.status, "planned"),
    ));
    const [{ pilot }] = await tx.select({
      pilot: sql<number>`count(*)::int`,
    }).from(mediaIngests).where(eq(mediaIngests.courseId, courseId));
    if (count + pilot >= 20) throw new IngestError("limit_reached");
    const expiresAt = new Date(Date.now() + MULTIPART_PLAN_LIFETIME_MS);
    const [created] = await tx.insert(mediaMultipartPlans).values({
      courseId, providerId: course.providerId, createdByUserId: userId,
      requestId: input.clientRequestId, title: input.title,
      expectedBytes: input.expectedBytes, expectedSha256: input.sha256,
      expiresAt,
    }).returning({ id: mediaMultipartPlans.id });
    return {
      uploadId: created.id, status: "planned" as const, replayed: false,
      expiresAt, plan: planMultipart(created.id, input.expectedBytes),
    };
  });
}
