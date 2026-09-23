import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coursePracticeQuestions, courses, privateMediaAssets, studentEnrollments,
  studentPracticeAttempts, studentVideoCompletions, supervisionGrants,
} from "../../db/schema";
import { listedFreeCourse } from "./entitlement";

/**
 * A read-only personal summary of self-reported video markers, NOT
 * watched-time, official achievement or proof of learning. Only CURRENTLY
 * accessible free enrollments are eligible; withdrawn assets do not count.
 *
 * Counts cover up to 20 most recently enrolled accessible courses, not all
 * historical courses. No third-party identities or object storage keys.
 */
export async function getStudentProgressOverview(studentUserId: string) {
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    enrolledAt: studentEnrollments.enrolledAt,
    readyVideos: count(privateMediaAssets.id),
    markedVideos: count(studentVideoCompletions.id),
  }).from(studentEnrollments)
    .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
    .innerJoin(supervisionGrants, eq(supervisionGrants.courseId, courses.id))
    .leftJoin(privateMediaAssets, and(
      eq(privateMediaAssets.courseId, courses.id),
      eq(privateMediaAssets.status, "ready"),
    ))
    .leftJoin(studentVideoCompletions, and(
      eq(studentVideoCompletions.assetId, privateMediaAssets.id),
      eq(studentVideoCompletions.studentUserId, studentUserId),
    ))
    .where(and(
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.status, "active"),
      listedFreeCourse(db),
    ))
    .groupBy(courses.id, courses.title, studentEnrollments.enrolledAt)
    .orderBy(desc(studentEnrollments.enrolledAt), asc(courses.id))
    .limit(21);
  const visibleRows = rows.slice(0, 20);
  // A separate query avoids multiplying media counts via a practice join.
  // It is restricted to courses that passed the current entitlement query;
  // rejected/pending questions and other students' attempts are never selected.
  const approved = visibleRows.length ? await db.select({
    courseId: coursePracticeQuestions.courseId,
    selectedOption: studentPracticeAttempts.selectedOption,
    correct: studentPracticeAttempts.correct,
    submittedAt: studentPracticeAttempts.submittedAt,
  }).from(coursePracticeQuestions).leftJoin(studentPracticeAttempts, and(
    eq(studentPracticeAttempts.courseId, coursePracticeQuestions.courseId),
    eq(studentPracticeAttempts.studentUserId, studentUserId),
  )).where(and(
    inArray(coursePracticeQuestions.courseId,
      visibleRows.map((row) => row.courseId)),
    eq(coursePracticeQuestions.reviewStatus, "approved"),
  )) : [];
  const practiceByCourse = new Map(approved.map((row) =>
    [row.courseId, row] as const));
  const visible = visibleRows.map((row) => {
    const practice = practiceByCourse.get(row.courseId);
    const practiceResult = !practice
      ? { state: "not_available" as const }
      : practice.selectedOption === null ||
          practice.correct === null || practice.submittedAt === null
        ? { state: "not_attempted" as const }
        : {
          state: "answered" as const,
          selectedOption: practice.selectedOption,
          correct: practice.correct,
          submittedAt: practice.submittedAt.toISOString(),
        };
    return {
      courseId: row.courseId,
      title: row.title,
      readyVideos: row.readyVideos,
      markedVideos: row.markedVideos,
      practice: practiceResult,
    };
  });
  return {
    courses: visible,
    hasMore: rows.length > 20,
    displayedReadyVideos: visible.reduce((total, row) => total + row.readyVideos, 0),
    displayedMarkedVideos: visible.reduce((total, row) => total + row.markedVideos, 0),
    displayedApprovedPractices: visible.filter((row) =>
      row.practice.state !== "not_available").length,
    displayedAnsweredPractices: visible.filter((row) =>
      row.practice.state === "answered").length,
  };
}
