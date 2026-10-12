import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  auditLogs, courses, educatorInstituteAffiliations, independentEducatorProfiles,
  memberships, supervisionEvents, supervisionGrants, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import type { NewIndependentEducatorCourse } from "./course-contracts";

export type IndependentEducatorCourseFailure =
  | "profile_unavailable" | "affiliation_unavailable" | "request_conflict"
  | "legacy_grant";

export class IndependentEducatorCourseError extends Error {
  constructor(readonly kind: IndependentEducatorCourseFailure) { super(kind); }
}

export async function createIndependentEducatorCourse(
  userId: string, input: NewIndependentEducatorCourse,
) {
  return getDb().transaction(async (tx) => {
    const [student] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, userId),
        eq(memberships.role, "student"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!student) throw new IndependentEducatorCourseError("profile_unavailable");

    const [profile] = await tx.select({
      id: independentEducatorProfiles.id,
    }).from(independentEducatorProfiles)
      .where(eq(independentEducatorProfiles.userId, userId))
      .limit(1).for("update");
    if (!profile) throw new IndependentEducatorCourseError("profile_unavailable");

    // Lock the approved affiliation. A concurrent revocation takes this same
    // row lock before transferring courses, so no new course can escape it.
    const [affiliation] = await tx.select({
      id: educatorInstituteAffiliations.id,
    }).from(educatorInstituteAffiliations)
      .where(and(
        eq(educatorInstituteAffiliations.educatorProfileId, profile.id),
        eq(educatorInstituteAffiliations.instituteId, input.instituteId),
        eq(educatorInstituteAffiliations.status, "approved"),
      )).limit(1).for("update");
    const [activeInstitute] = await tx.select({ id: memberships.id })
      .from(memberships).innerJoin(verifiedEntities, and(
        eq(verifiedEntities.id, memberships.instituteId),
        eq(verifiedEntities.role, "institute"),
      )).where(and(
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, input.instituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!affiliation || !activeInstitute) {
      throw new IndependentEducatorCourseError("affiliation_unavailable");
    }

    const [prior] = await tx.select().from(courses).where(and(
      eq(courses.ownerType, "independent_educator"),
      eq(courses.independentEducatorProfileId, profile.id),
      eq(courses.clientRequestId, input.clientRequestId),
    )).limit(1);
    if (prior) {
      if (prior.title !== input.title ||
          prior.responsibleInstituteId !== input.instituteId) {
        throw new IndependentEducatorCourseError("request_conflict");
      }
      const [grant] = await tx.select({
        status: supervisionGrants.status,
      }).from(supervisionGrants)
        .where(eq(supervisionGrants.courseId, prior.id)).limit(1);
      if (!grant) throw new IndependentEducatorCourseError("legacy_grant");
      return {
        courseId: prior.id, status: grant.status, replayed: true,
      };
    }

    const [created] = await tx.insert(courses).values({
      ownerType: "independent_educator",
      independentEducatorProfileId: profile.id,
      providerId: null,
      responsibleInstituteId: input.instituteId,
      title: input.title,
      clientRequestId: input.clientRequestId,
    }).onConflictDoNothing().returning({ id: courses.id });
    if (!created) {
      const [conflict] = await tx.select({ id: courses.id })
        .from(courses).where(and(
          eq(courses.ownerType, "independent_educator"),
          eq(courses.independentEducatorProfileId, profile.id),
          eq(courses.clientRequestId, input.clientRequestId),
        )).limit(1);
      if (!conflict) throw new IndependentEducatorCourseError("request_conflict");
      const [grant] = await tx.select({ status: supervisionGrants.status })
        .from(supervisionGrants)
        .where(eq(supervisionGrants.courseId, conflict.id)).limit(1);
      if (!grant) throw new IndependentEducatorCourseError("legacy_grant");
      return { courseId: conflict.id, status: grant.status, replayed: true };
    }

    await tx.insert(supervisionGrants).values({
      courseId: created.id,
      ownerType: "independent_educator",
      providerId: null,
      independentEducatorProfileId: profile.id,
      instituteId: input.instituteId,
      requestedByProviderUserId: userId,
      status: "requested",
    });
    await tx.insert(supervisionEvents).values({
      courseId: created.id,
      ownerType: "independent_educator",
      providerId: null,
      independentEducatorProfileId: profile.id,
      instituteId: input.instituteId,
      actorUserId: userId,
      kind: "requested",
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "student",
      action: "course.supervision.requested",
      entityType: "COURSE", entityId: created.id,
    }));
    return { courseId: created.id, status: "requested" as const, replayed: false };
  });
}

export async function getIndependentEducatorCourses(userId: string) {
  const [profile] = await getDb().select({
    id: independentEducatorProfiles.id,
  }).from(independentEducatorProfiles)
    .where(eq(independentEducatorProfiles.userId, userId)).limit(1);
  if (!profile) return [];
  return getDb().select({
    courseId: courses.id,
    title: courses.title,
    instituteId: courses.responsibleInstituteId,
    instituteName: verifiedEntities.name,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
  }).from(courses).innerJoin(
    supervisionGrants, eq(supervisionGrants.courseId, courses.id),
  ).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, courses.responsibleInstituteId),
    eq(verifiedEntities.role, "institute"),
  )).where(and(
    eq(courses.ownerType, "independent_educator"),
    eq(courses.independentEducatorProfileId, profile.id),
  )).orderBy(desc(courses.id)).limit(100);
}
