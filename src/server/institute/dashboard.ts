import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coursePracticeQuestions, courses, privateMediaAssets, supervisionGrants,
} from "../../db/schema";

/** A limited overview, not an approval grant or access to student identities. */
export async function getInstituteDashboardCourses(instituteIds: readonly string[]) {
  if (!instituteIds.length) return { courses: [], hasMore: false };
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    supervisionStatus: supervisionGrants.status,
    publicationStatus: courses.publicationStatus,
  }).from(supervisionGrants).innerJoin(courses, and(
    eq(courses.id, supervisionGrants.courseId),
    eq(courses.providerId, supervisionGrants.providerId),
    eq(courses.responsibleInstituteId, supervisionGrants.instituteId),
  )).where(inArray(supervisionGrants.instituteId, [...instituteIds]))
    .orderBy(desc(supervisionGrants.requestedAt), asc(courses.id))
    .limit(21);
  const visible = rows.slice(0, 20);
  if (!visible.length) return { courses: [], hasMore: false };
  const courseIds = visible.map((course) => course.courseId);
  // Query only course IDs already validated against the live institute scope.
  // Keep counts separate from question rows to prevent multiplication.
  // Student attempts, notes, question text/answer and storage keys are absent.
  const [assetRows, questionRows] = await Promise.all([
    db.select({
      courseId: privateMediaAssets.courseId,
      readyVideos: count(privateMediaAssets.id),
    }).from(privateMediaAssets).where(and(
      inArray(privateMediaAssets.courseId, courseIds),
      eq(privateMediaAssets.status, "ready"),
    )).groupBy(privateMediaAssets.courseId),
    db.select({
      courseId: coursePracticeQuestions.courseId,
      reviewStatus: coursePracticeQuestions.reviewStatus,
    }).from(coursePracticeQuestions).where(
      inArray(coursePracticeQuestions.courseId, courseIds),
    ),
  ]);
  const readyByCourse = new Map(assetRows.map((row) =>
    [row.courseId, row.readyVideos] as const));
  const reviewByCourse = new Map(questionRows.map((row) =>
    [row.courseId, row.reviewStatus] as const));
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
