import { and, asc, count, desc, eq, gte, inArray, max } from "drizzle-orm";
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
function tehranWeekStart(now: Date) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => dateParts.find((item) => item.type === type)?.value ?? "";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const localMidnight = Date.UTC(year, month - 1, day);
  const daysSinceSaturday = (new Date(localMidnight).getUTCDay() + 1) % 7;
  const offsetText = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran", timeZoneName: "longOffset",
  }).formatToParts(now).find((item) => item.type === "timeZoneName")?.value ?? "GMT+00:00";
  const offsetParts = offsetText.slice(4).split(":").map(Number);
  const offsetMinutes = offsetParts.length === 2 && offsetParts.every(Number.isFinite)
    ? (offsetText[3] === "-" ? -1 : 1) * (offsetParts[0] * 60 + offsetParts[1])
    : 0;
  return new Date(localMidnight - daysSinceSaturday * 24 * 60 * 60 * 1000 - offsetMinutes * 60 * 1000);
}

export async function getStudentProgressOverview(studentUserId: string) {
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    enrolledAt: studentEnrollments.enrolledAt,
    readyVideos: count(privateMediaAssets.id),
    markedVideos: count(studentVideoCompletions.id),
    lastVideoActivityAt: max(studentVideoCompletions.completedAt),
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
  const weekCutoff = tehranWeekStart(new Date());
  const [weeklyVideoRow] = visibleRows.length ? await db.select({
    total: count(studentVideoCompletions.id),
  }).from(studentVideoCompletions).innerJoin(privateMediaAssets, and(
    eq(privateMediaAssets.id, studentVideoCompletions.assetId),
    eq(privateMediaAssets.status, "ready"),
  )).where(and(
    eq(studentVideoCompletions.studentUserId, studentUserId),
    inArray(privateMediaAssets.courseId, visibleRows.map((row) => row.courseId)),
    gte(studentVideoCompletions.completedAt, weekCutoff),
  )) : [{ total: 0 }];
  const weeklyPractices = new Set(approved.filter((row) =>
    row.submittedAt !== null && row.submittedAt >= weekCutoff,
  ).map((row) => row.courseId)).size;
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
      lastActivityAt: [row.lastVideoActivityAt, practice?.submittedAt ?? null]
        .filter((value): value is Date => value !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
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
    weeklyMarkedVideos: weeklyVideoRow.total,
    weeklyAnsweredPractices: weeklyPractices,
  };
}
