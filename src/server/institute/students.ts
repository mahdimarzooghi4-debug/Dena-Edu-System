import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courseLearningAssessments,
  courses,
  privateMediaAssets,
  studentEnrollments,
  studentLearningAssessmentAttempts,
  studentVideoCompletions,
  supervisionGrants,
  user,
} from "../../db/schema";

export async function getInstituteStudentProfile(
  instituteIds: readonly string[],
  studentId: string,
) {
  if (!instituteIds.length) return null;
  const db = getDb();
  const enrollments = await db.select({
    courseId: courses.id,
    courseTitle: courses.title,
    enrollmentStatus: studentEnrollments.status,
    enrolledAt: studentEnrollments.enrolledAt,
  }).from(studentEnrollments)
    .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
    .innerJoin(supervisionGrants, and(
      eq(supervisionGrants.courseId, courses.id),
      eq(supervisionGrants.ownerType, courses.ownerType),
      eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
      inArray(supervisionGrants.instituteId, [...instituteIds]),
    ))
    .where(eq(studentEnrollments.studentUserId, studentId))
    .orderBy(asc(studentEnrollments.enrolledAt), asc(courses.title));
  if (!enrollments.length) return null;

  const courseIds = [...new Set(enrollments.map((row) => row.courseId))];
  const [studentRows, assetRows, videoRows, assessmentRows] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, studentId)).limit(1),
    db.select({
      courseId: privateMediaAssets.courseId,
      totalVideos: count(privateMediaAssets.id),
      completedVideos: count(studentVideoCompletions.id),
    }).from(privateMediaAssets)
      .leftJoin(studentVideoCompletions, and(
        eq(studentVideoCompletions.assetId, privateMediaAssets.id),
        eq(studentVideoCompletions.studentUserId, studentId),
      ))
      .where(and(
        inArray(privateMediaAssets.courseId, courseIds),
        eq(privateMediaAssets.status, "ready"),
      ))
      .groupBy(privateMediaAssets.courseId),
    db.select({
      title: privateMediaAssets.title,
      courseTitle: courses.title,
      occurredAt: studentVideoCompletions.completedAt,
    }).from(studentVideoCompletions)
      .innerJoin(privateMediaAssets, eq(privateMediaAssets.id, studentVideoCompletions.assetId))
      .innerJoin(courses, eq(courses.id, privateMediaAssets.courseId))
      .innerJoin(supervisionGrants, and(
        eq(supervisionGrants.courseId, courses.id),
        eq(supervisionGrants.ownerType, courses.ownerType),
        eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
        inArray(supervisionGrants.instituteId, [...instituteIds]),
      ))
      .where(and(
        eq(studentVideoCompletions.studentUserId, studentId),
        inArray(courses.id, courseIds),
      ))
      .orderBy(desc(studentVideoCompletions.completedAt))
      .limit(20),
    db.select({
      title: courseLearningAssessments.title,
      courseTitle: courses.title,
      occurredAt: studentLearningAssessmentAttempts.submittedAt,
    }).from(studentLearningAssessmentAttempts)
      .innerJoin(courseLearningAssessments, and(
        eq(courseLearningAssessments.id, studentLearningAssessmentAttempts.assessmentId),
        eq(courseLearningAssessments.courseId, studentLearningAssessmentAttempts.courseId),
      ))
      .innerJoin(courses, eq(courses.id, studentLearningAssessmentAttempts.courseId))
      .innerJoin(supervisionGrants, and(
        eq(supervisionGrants.courseId, courses.id),
        eq(supervisionGrants.ownerType, courses.ownerType),
        eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
        inArray(supervisionGrants.instituteId, [...instituteIds]),
      ))
      .where(and(
        eq(studentLearningAssessmentAttempts.studentUserId, studentId),
        eq(studentLearningAssessmentAttempts.status, "submitted"),
        isNotNull(studentLearningAssessmentAttempts.submittedAt),
        inArray(courses.id, courseIds),
      ))
      .orderBy(desc(studentLearningAssessmentAttempts.submittedAt))
      .limit(20),
  ]);

  const assetsByCourse = new Map(assetRows.map((row) =>
    [row.courseId, row] as const));
  const courseById = new Map<string, {
    courseId: string;
    title: string;
    status: "active" | "inactive";
    enrolledAt: Date;
    totalVideos: number;
    completedVideos: number;
  }>();
  for (const row of enrollments) {
    const course = courseById.get(row.courseId);
    const counts = assetsByCourse.get(row.courseId);
    if (!course) {
      courseById.set(row.courseId, {
        courseId: row.courseId,
        title: row.courseTitle,
        status: row.enrollmentStatus === "active" ? "active" : "inactive",
        enrolledAt: row.enrolledAt,
        totalVideos: counts?.totalVideos ?? 0,
        completedVideos: counts?.completedVideos ?? 0,
      });
    }
  }

  const activities = [
    ...videoRows.map((row) => ({
      kind: "video" as const,
      title: row.title,
      courseTitle: row.courseTitle,
      occurredAt: row.occurredAt,
    })),
    ...assessmentRows.flatMap((row) => row.occurredAt ? [{
      kind: "assessment" as const,
      title: row.title,
      courseTitle: row.courseTitle,
      occurredAt: row.occurredAt,
    }] : []),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 10);

  const activeEnrollment = enrollments.some((row) => row.enrollmentStatus === "active");
  return {
    studentId,
    name: studentRows[0]?.name ?? "دانش‌آموز",
    status: activeEnrollment ? "active" as const : "inactive" as const,
    enrolledAt: enrollments[0]!.enrolledAt,
    courses: [...courseById.values()],
    activities,
  };
}


/** Safe growth timeline for one student and one institute-supervised course.
 * It reports media completion and attempt lifecycle only; score, outcome,
 * selected answers and private notes are intentionally excluded. */
export async function getInstituteStudentGrowth(
  instituteIds: readonly string[],
  studentId: string,
  courseId: string,
) {
  if (!instituteIds.length) return null;
  const db = getDb();
  const [enrollment] = await db.select({
    courseId: courses.id,
    courseTitle: courses.title,
    enrollmentStatus: studentEnrollments.status,
    enrolledAt: studentEnrollments.enrolledAt,
  }).from(studentEnrollments)
    .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
    .innerJoin(supervisionGrants, and(
      eq(supervisionGrants.courseId, courses.id),
      eq(supervisionGrants.ownerType, courses.ownerType),
      eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
      inArray(supervisionGrants.instituteId, [...instituteIds]),
    ))
    .where(and(
      eq(studentEnrollments.studentUserId, studentId),
      eq(courses.id, courseId),
    ))
    .limit(1);
  if (!enrollment) return null;

  const [videos, attempts] = await Promise.all([
    db.select({
      assetId: privateMediaAssets.id,
      title: privateMediaAssets.title,
      completedAt: studentVideoCompletions.completedAt,
    }).from(privateMediaAssets)
      .leftJoin(studentVideoCompletions, and(
        eq(studentVideoCompletions.assetId, privateMediaAssets.id),
        eq(studentVideoCompletions.studentUserId, studentId),
      ))
      .where(and(
        eq(privateMediaAssets.courseId, courseId),
        eq(privateMediaAssets.status, "ready"),
      ))
      .orderBy(asc(privateMediaAssets.createdAt), asc(privateMediaAssets.id))
      .limit(500),
    db.select({
      assessmentId: courseLearningAssessments.id,
      title: courseLearningAssessments.title,
      attemptNumber: studentLearningAssessmentAttempts.attemptNumber,
      status: studentLearningAssessmentAttempts.status,
      startedAt: studentLearningAssessmentAttempts.startedAt,
      submittedAt: studentLearningAssessmentAttempts.submittedAt,
    }).from(studentLearningAssessmentAttempts)
      .innerJoin(courseLearningAssessments, and(
        eq(courseLearningAssessments.id, studentLearningAssessmentAttempts.assessmentId),
        eq(courseLearningAssessments.courseId, studentLearningAssessmentAttempts.courseId),
        eq(courseLearningAssessments.reviewStatus, "approved"),
      ))
      .where(and(
        eq(studentLearningAssessmentAttempts.studentUserId, studentId),
        eq(studentLearningAssessmentAttempts.courseId, courseId),
      ))
      .orderBy(asc(studentLearningAssessmentAttempts.startedAt),
        asc(studentLearningAssessmentAttempts.attemptNumber))
      .limit(500),
  ]);

  const completedVideos = videos.filter((video) => video.completedAt !== null);
  let completedCount = 0;
  const events: Array<{ kind: "enrollment" | "video" | "assessment" | "now"; title: string; occurredAt: Date; progress: number | null }> = [{
    kind: "enrollment" as const,
    title: "شروع دوره",
    occurredAt: enrollment.enrolledAt,
    progress: 0,
  }];
  const rawEvents = [
    ...completedVideos.map((video) => ({
      kind: "video" as const,
      title: video.title,
      occurredAt: video.completedAt!,
      order: 1,
    })),
    ...attempts.map((attempt) => ({
      kind: "assessment" as const,
      title: attempt.title,
      occurredAt: attempt.status === "submitted" && attempt.submittedAt
        ? attempt.submittedAt
        : attempt.startedAt,
      order: 2,
    })),
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.order - b.order);

  for (const event of rawEvents) {
    if (event.kind === "video") completedCount += 1;
    events.push({
      kind: event.kind,
      title: event.title,
      occurredAt: event.occurredAt,
      progress: videos.length ? Math.round(completedCount / videos.length * 100) : null,
    });
  }
  if (videos.length) {
    events.push({
      kind: "now" as const,
      title: "اکنون",
      occurredAt: new Date(),
      progress: Math.round(completedVideos.length / videos.length * 100),
    });
  }

  const latestAssessment = [...attempts]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null;
  return {
    courseId,
    courseTitle: enrollment.courseTitle,
    enrollmentStatus: enrollment.enrollmentStatus,
    enrolledAt: enrollment.enrolledAt,
    totalVideos: videos.length,
    completedVideos: completedVideos.length,
    events,
    latestAssessment,
  };
}
