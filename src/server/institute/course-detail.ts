import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coursePracticeQuestions, courses, independentEducatorProfiles,
  privateMediaAssets, studentEnrollments, supervisionGrants, verifiedEntities,
} from "../../db/schema";

/** Read-only, institute-scoped course metadata. The caller derives scopes
 * from the active Better Auth session, not a user-provided role or institute ID.
 * Approval, review and access to learner media remain separate permissions.
 * Never select private notes, student attempts, storage keys or evidence.
 */
export async function getInstituteCourseDetail(
  instituteIds: readonly string[], courseId: string,
) {
  if (!instituteIds.length) return null;
  const db = getDb();
  const [course] = await db.select({
    courseId: courses.id,
    title: courses.title,
    ownerType: courses.ownerType,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
    requestedAt: supervisionGrants.requestedAt,
    providerName: verifiedEntities.name,
    independentEducatorName: independentEducatorProfiles.displayName,
  }).from(courses).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.ownerType, courses.ownerType),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).leftJoin(verifiedEntities, and(
    eq(verifiedEntities.id, courses.providerId),
    eq(verifiedEntities.role, "provider"),
  )).leftJoin(independentEducatorProfiles, eq(
    independentEducatorProfiles.id, courses.independentEducatorProfileId,
  )).where(and(
    eq(courses.id, courseId),
    inArray(supervisionGrants.instituteId, [...instituteIds]),
  )).limit(1);
  if (!course) return null;
  const [[assets], [question], [enrollment]] = await Promise.all([
    db.select({ readyVideos: count(privateMediaAssets.id) })
      .from(privateMediaAssets).where(and(
        eq(privateMediaAssets.courseId, courseId),
        eq(privateMediaAssets.status, "ready"),
      )),
    db.select({ reviewStatus: coursePracticeQuestions.reviewStatus })
      .from(coursePracticeQuestions).where(
        eq(coursePracticeQuestions.courseId, courseId),
      ).limit(1),
    db.select({ activeEnrollmentCount: count(studentEnrollments.id) })
      .from(studentEnrollments).where(and(
        eq(studentEnrollments.courseId, courseId),
        eq(studentEnrollments.status, "active"),
      )),
  ]);
  return {
    ...course,
    readyVideos: assets.readyVideos,
    activeEnrollmentCount: enrollment.activeEnrollmentCount,
    practiceReviewStatus: question?.reviewStatus ?? ("not_created" as const),
  };
}
