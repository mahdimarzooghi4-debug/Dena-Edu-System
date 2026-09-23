import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coursePracticeQuestions, courses, privateMediaAssets, supervisionGrants,
  verifiedEntities,
} from "../../db/schema";

/**
 * Read-only single-course workbench. Call with provider scopes from the
 * live Better Auth session, never from request parameters. This is not a
 * publication/ingest authorization: those operations recheck independently.
 *
 * Do not select learner identities, answers, notes, object keys, reviewer
 * evidence, or any other provider's course. A named responsible institute
 * is a Dena-verified entity, NOT an official education license.
 */
export async function getProviderCourseDetail(
  providerIds: readonly string[], courseId: string,
) {
  if (!providerIds.length) return null;
  const db = getDb();
  const [course] = await db.select({
    courseId: courses.id,
    title: courses.title,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
    responsibleInstituteName: verifiedEntities.name,
  }).from(courses).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.providerId, courses.providerId),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, courses.responsibleInstituteId),
    eq(verifiedEntities.role, "institute"),
  )).where(and(
    eq(courses.id, courseId),
    inArray(courses.providerId, [...providerIds]),
  )).limit(1);
  if (!course) return null;
  const [[assets], [question]] = await Promise.all([
    db.select({ readyVideos: count(privateMediaAssets.id) })
      .from(privateMediaAssets).where(and(
        eq(privateMediaAssets.courseId, courseId),
        eq(privateMediaAssets.status, "ready"),
      )),
    db.select({ reviewStatus: coursePracticeQuestions.reviewStatus })
      .from(coursePracticeQuestions).where(
        eq(coursePracticeQuestions.courseId, courseId),
      ).limit(1),
  ]);
  return {
    ...course,
    readyVideos: assets.readyVideos,
    practiceReviewStatus: question?.reviewStatus ?? ("not_created" as const),
  };
}
