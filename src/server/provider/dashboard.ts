import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coursePracticeQuestions, courses, privateMediaAssets, supervisionGrants,
} from "../../db/schema";

/** Scoped display only; publication and ingest must reauthorize transactionally. */
export async function getProviderDashboardCourses(providerIds: readonly string[]) {
  if (!providerIds.length) return { courses: [], hasMore: false };
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    supervisionStatus: supervisionGrants.status,
    publicationStatus: courses.publicationStatus,
  }).from(courses).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.providerId, courses.providerId),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).where(inArray(courses.providerId, [...providerIds]))
    .orderBy(desc(supervisionGrants.requestedAt), asc(courses.id))
    .limit(21);
  const visible = rows.slice(0, 20);
  if (!visible.length) return { courses: [], hasMore: false };
  const visibleIds = visible.map((course) => course.courseId);
  // Two metadata-only queries prevent join fan-out from inflating ready
  // counts. Neither fetches student attempts, notes, answer keys or object keys.
  const [assets, questions] = await Promise.all([
    db.select({
      courseId: privateMediaAssets.courseId,
      readyVideos: count(privateMediaAssets.id),
    }).from(privateMediaAssets).where(and(
      inArray(privateMediaAssets.courseId, visibleIds),
      eq(privateMediaAssets.status, "ready"),
    )).groupBy(privateMediaAssets.courseId),
    db.select({
      courseId: coursePracticeQuestions.courseId,
      reviewStatus: coursePracticeQuestions.reviewStatus,
    }).from(coursePracticeQuestions).where(
      inArray(coursePracticeQuestions.courseId, visibleIds),
    ),
  ]);
  const readyByCourse = new Map(assets.map((item) =>
    [item.courseId, item.readyVideos] as const));
  const reviewByCourse = new Map(questions.map((item) =>
    [item.courseId, item.reviewStatus] as const));
  return {
    courses: visible.map((course) => ({
      ...course,
      readyVideos: readyByCourse.get(course.courseId) ?? 0,
      practiceReviewStatus: reviewByCourse.get(course.courseId) ??
        ("not_created" as const),
    })),
    hasMore: rows.length > 20,
  };
}
