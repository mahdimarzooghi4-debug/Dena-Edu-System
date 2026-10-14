import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courses, educatorInstituteAffiliations, independentEducatorProfiles,
  mediaIngests, mediaMultipartPlans, memberships, supervisionGrants,
} from "../../db/schema";
import { MAX_MULTIPART_BYTES, MULTIPART_PART_BYTES, planMultipart } from "./multipart";
import { IngestError, type IngestInput } from "./ingest";
import { isVerifiedProviderCourse } from "../courses/ownership";

export type MultipartOwner = "provider" | "independent_educator";

/** Purely inert control-plane switch: even when enabled this MUST NOT grant
 * direct upload, create storage sessions or accept arbitrary client keys.
 */
export const MIN_MULTIPART_BYTES = MULTIPART_PART_BYTES + 1;
export const MULTIPART_PLAN_LIFETIME_MS = 24 * 60 * 60 * 1000;
export function multipartPlanningEnabled() {
  return process.env.DENA_MULTIPART_PLANNING_ENABLED === "1";
}

export async function reserveMultipartPlan(
  userId: string, courseId: string, input: IngestInput, owner: MultipartOwner = "provider",
) {
  if (!multipartPlanningEnabled()) throw new IngestError("not_available");
  if (!Number.isSafeInteger(input.expectedBytes) ||
      input.expectedBytes < MIN_MULTIPART_BYTES ||
      input.expectedBytes > MAX_MULTIPART_BYTES) throw new IngestError("not_available");
  return getDb().transaction(async tx => {
    // Revocation locks affiliation before course. Use the same order here, then
    // serialize the multipart and bounded pilot quota on the course row.
    const [scope] = await tx.select({
      ownerType: courses.ownerType,
      profileId: courses.independentEducatorProfileId,
      instituteId: courses.responsibleInstituteId,
    }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (owner === "independent_educator" && scope?.profileId) {
      await tx.select({ id: educatorInstituteAffiliations.id })
        .from(educatorInstituteAffiliations).where(and(
          eq(educatorInstituteAffiliations.educatorProfileId, scope.profileId),
          eq(educatorInstituteAffiliations.instituteId, scope.instituteId),
          eq(educatorInstituteAffiliations.status, "approved"),
        )).limit(1).for("share");
    }
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course || course.publicationStatus !== "draft" ||
        (owner === "provider" && !isVerifiedProviderCourse(course)) ||
        (owner === "independent_educator" &&
          (course.ownerType !== "independent_educator" ||
            !course.independentEducatorProfileId))) {
      throw new IngestError("not_available");
    }
    let profileId: string | null = null;
    if (owner === "provider" && isVerifiedProviderCourse(course)) {
      const [provider] = await tx.select({ id: memberships.id })
        .from(memberships).where(and(eq(memberships.userId, userId),
          eq(memberships.role, "provider"),
          eq(memberships.providerId, course.providerId),
          eq(memberships.status, "active"))).limit(1).for("share");
      if (!provider) throw new IngestError("not_provider");
    } else if (owner === "independent_educator" && course.independentEducatorProfileId) {
      profileId = course.independentEducatorProfileId;
      const [profile] = await tx.select({ id: independentEducatorProfiles.id })
        .from(independentEducatorProfiles).where(and(
          eq(independentEducatorProfiles.id, profileId),
          eq(independentEducatorProfiles.userId, userId),
        )).limit(1).for("share");
      const [student] = await tx.select({ id: memberships.id }).from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.role, "student"),
          eq(memberships.status, "active"))).limit(1).for("share");
      const [affiliation] = await tx.select({ id: educatorInstituteAffiliations.id })
        .from(educatorInstituteAffiliations).where(and(
          eq(educatorInstituteAffiliations.educatorProfileId, profileId),
          eq(educatorInstituteAffiliations.instituteId, course.responsibleInstituteId),
          eq(educatorInstituteAffiliations.status, "approved"),
        )).limit(1).for("share");
      if (!profile || !student || !affiliation) throw new IngestError("not_provider");
    }
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.ownerType, owner === "provider"
        ? "verified_provider" : "independent_educator"),
      owner === "provider" ? eq(supervisionGrants.providerId, course.providerId!)
        : eq(supervisionGrants.independentEducatorProfileId, profileId!),
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
      courseId, ownerType: owner === "provider" ? "verified_provider" : "independent_educator",
      providerId: owner === "provider" ? course.providerId : null,
      independentEducatorProfileId: profileId,
      createdByUserId: userId,
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

/** Read and cancellation are available even after an institute has revoked
 * supervision. The creator still must be an ACTIVE scoped provider, but never
 * needs an active institute approval merely to revoke their inert plan.
 */
export async function listOwnMultipartPlans(
  userId: string, courseId: string, owner: MultipartOwner = "provider",
) {
  if (!multipartPlanningEnabled()) throw new IngestError("not_available");
  const db = getDb();
  const [course] = await db.select({
    ownerType: courses.ownerType, providerId: courses.providerId,
    profileId: courses.independentEducatorProfileId,
  })
    .from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new IngestError("not_available");
  if (owner === "provider") {
    if (!isVerifiedProviderCourse(course)) throw new IngestError("not_available");
    const [provider] = await db.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId),
        eq(memberships.status, "active"))).limit(1);
    if (!provider) throw new IngestError("not_provider");
  } else {
    if (course.ownerType !== "independent_educator" || !course.profileId) {
      throw new IngestError("not_available");
    }
    const [ownerMembership] = await db.select({ id: memberships.id })
      .from(independentEducatorProfiles).innerJoin(memberships, and(
        eq(memberships.userId, independentEducatorProfiles.userId),
        eq(memberships.userId, userId), eq(memberships.role, "student"),
        eq(memberships.status, "active"),
      )).where(eq(independentEducatorProfiles.id, course.profileId)).limit(1);
    if (!ownerMembership) throw new IngestError("not_provider");
  }
  const ownerPlanScope = owner === "provider"
    ? and(eq(mediaMultipartPlans.ownerType, "verified_provider"),
      eq(mediaMultipartPlans.providerId, course.providerId!))
    : and(eq(mediaMultipartPlans.ownerType, "independent_educator"),
      eq(mediaMultipartPlans.independentEducatorProfileId, course.profileId!));
  const plans = await db.select({
    uploadId: mediaMultipartPlans.id,
    title: mediaMultipartPlans.title,
    status: mediaMultipartPlans.status,
    expectedBytes: mediaMultipartPlans.expectedBytes,
    expectedSha256: mediaMultipartPlans.expectedSha256,
    createdAt: mediaMultipartPlans.createdAt,
    expiresAt: mediaMultipartPlans.expiresAt,
    cancelledAt: mediaMultipartPlans.cancelledAt,
  }).from(mediaMultipartPlans).where(and(
    eq(mediaMultipartPlans.courseId, courseId),
    eq(mediaMultipartPlans.createdByUserId, userId),
    ownerPlanScope,
  )).orderBy(sql`${mediaMultipartPlans.createdAt} DESC`).limit(20);
  // Return truthful derived expiry on GET, even if no reservation has run
  // since a background plan expired. Never return an expired upload plan.
  return plans.map(p => ({
    ...p, status: p.status === "planned" && p.expiresAt <= new Date()
      ? "expired" : p.status,
  }));
}

export async function cancelOwnMultipartPlan(
  userId: string, courseId: string, uploadId: string, owner: MultipartOwner = "provider",
): Promise<"cancelled" | "expired" | "not_found" | "not_provider"> {
  if (!multipartPlanningEnabled()) throw new IngestError("not_available");
  return getDb().transaction(async tx => {
    const [scope] = await tx.select({
      ownerType: courses.ownerType,
      profileId: courses.independentEducatorProfileId,
      instituteId: courses.responsibleInstituteId,
    }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (owner === "independent_educator" && scope?.profileId) {
      await tx.select({ id: educatorInstituteAffiliations.id })
        .from(educatorInstituteAffiliations).where(and(
          eq(educatorInstituteAffiliations.educatorProfileId, scope.profileId),
          eq(educatorInstituteAffiliations.instituteId, scope.instituteId),
          eq(educatorInstituteAffiliations.status, "approved"),
        )).limit(1).for("share");
    }
    // A course row lock serializes quota with BOTH pilot and multipart create.
    const [course] = await tx.select({
      ownerType: courses.ownerType, providerId: courses.providerId,
      profileId: courses.independentEducatorProfileId,
    })
      .from(courses).where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course) return "not_found" as const;
    let profileId: string | null = null;
    if (owner === "provider") {
      if (!isVerifiedProviderCourse(course)) return "not_found" as const;
      const [provider] = await tx.select({ id: memberships.id })
        .from(memberships).where(and(eq(memberships.userId, userId),
          eq(memberships.role, "provider"), eq(memberships.providerId, course.providerId),
          eq(memberships.status, "active"))).limit(1).for("share");
      if (!provider) return "not_provider" as const;
    } else {
      if (course.ownerType !== "independent_educator" || !course.profileId) {
        return "not_found" as const;
      }
      profileId = course.profileId;
      const [ownerMembership] = await tx.select({ id: memberships.id })
        .from(independentEducatorProfiles).innerJoin(memberships, and(
          eq(memberships.userId, independentEducatorProfiles.userId),
          eq(memberships.userId, userId), eq(memberships.role, "student"),
          eq(memberships.status, "active"),
        )).where(eq(independentEducatorProfiles.id, profileId)).limit(1).for("share");
      if (!ownerMembership) return "not_provider" as const;
    }
    const [plan] = await tx.select().from(mediaMultipartPlans).where(and(
      eq(mediaMultipartPlans.id, uploadId),
      eq(mediaMultipartPlans.courseId, courseId),
      eq(mediaMultipartPlans.ownerType, owner === "provider"
        ? "verified_provider" : "independent_educator"),
      owner === "provider" ? eq(mediaMultipartPlans.providerId, course.providerId!)
        : eq(mediaMultipartPlans.independentEducatorProfileId, profileId!),
      eq(mediaMultipartPlans.createdByUserId, userId),
    )).limit(1).for("update");
    if (!plan) return "not_found" as const;
    if (plan.status === "cancelled") return "cancelled" as const;
    if (plan.status === "expired") return "expired" as const;
    if (plan.expiresAt <= new Date()) {
      await tx.update(mediaMultipartPlans).set({ status: "expired" })
        .where(eq(mediaMultipartPlans.id, plan.id));
      return "expired" as const;
    }
    await tx.update(mediaMultipartPlans).set({
      status: "cancelled", cancelledAt: new Date(),
    }).where(eq(mediaMultipartPlans.id, plan.id));
    return "cancelled" as const;
  });
}
