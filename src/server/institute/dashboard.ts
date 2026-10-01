import { and, asc, count, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseLearningAssessments, coursePracticeQuestions, courses,
  privateMediaAssets, providerInstituteCollaborations, supervisionGrants,
  verifiedEntities,
} from "../../db/schema";

const instituteDashboardProvider = alias(verifiedEntities, "institute_dashboard_provider");
const instituteDashboardInstitute = alias(verifiedEntities, "institute_dashboard_institute");

const courseCursorSchema = z.object({
  requestedAt: z.string().datetime(),
  courseId: z.uuid(),
}).strict();

export function encodeInstituteCourseCursor(input: {
  requestedAt: Date;
  courseId: string;
}) {
  return Buffer.from(JSON.stringify({
    requestedAt: input.requestedAt.toISOString(),
    courseId: input.courseId,
  })).toString("base64url");
}

export function decodeInstituteCourseCursor(token: string) {
  if (!token || token.length > 1024) return null;
  try {
    const parsed = courseCursorSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    return { requestedAt: new Date(parsed.data.requestedAt),
      courseId: parsed.data.courseId };
  } catch {
    return null;
  }
}

/** A limited overview, not an approval grant or access to student identities. */
export async function getInstituteDashboardCourses(
  instituteIds: readonly string[], cursorToken?: string,
) {
  if (!instituteIds.length) {
    return { courses: [], hasMore: false, nextCursor: null, invalidCursor: false };
  }
  const cursor = cursorToken ? decodeInstituteCourseCursor(cursorToken) : null;
  if (cursorToken && !cursor) {
    return { courses: [], hasMore: false, nextCursor: null, invalidCursor: true };
  }
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    providerName: instituteDashboardProvider.name,
    instituteName: instituteDashboardInstitute.name,
    providerCollaborationApproved: sql<boolean>`exists (
      select 1 from ${providerInstituteCollaborations}
      where ${providerInstituteCollaborations.providerId} = ${courses.providerId}
        and ${providerInstituteCollaborations.instituteId} = ${courses.responsibleInstituteId}
        and ${providerInstituteCollaborations.status} = 'approved'
    )`,
    supervisionStatus: supervisionGrants.status,
    publicationStatus: courses.publicationStatus,
    requestedAt: supervisionGrants.requestedAt,
  }).from(supervisionGrants).innerJoin(courses, and(
    eq(courses.id, supervisionGrants.courseId),
    eq(courses.providerId, supervisionGrants.providerId),
    eq(courses.responsibleInstituteId, supervisionGrants.instituteId),
  )).innerJoin(instituteDashboardProvider, and(
    eq(instituteDashboardProvider.id, courses.providerId),
    eq(instituteDashboardProvider.role, "provider"),
  )).innerJoin(instituteDashboardInstitute, and(
    eq(instituteDashboardInstitute.id, courses.responsibleInstituteId),
    eq(instituteDashboardInstitute.role, "institute"),
  )).where(and(
    inArray(supervisionGrants.instituteId, [...instituteIds]),
    ...(cursor ? [or(
      lt(supervisionGrants.requestedAt, cursor.requestedAt),
      and(
        eq(supervisionGrants.requestedAt, cursor.requestedAt),
        gt(courses.id, cursor.courseId),
      ),
    )!] : []),
  ))
    .orderBy(desc(supervisionGrants.requestedAt), asc(courses.id))
    .limit(21);
  const visible = rows.slice(0, 20);
  if (!visible.length) {
    return { courses: [], hasMore: false, nextCursor: null, invalidCursor: false };
  }
  const courseIds = visible.map((course) => course.courseId);
  // Query only course IDs already validated against the live institute scope.
  // Keep counts separate from question rows to prevent multiplication.
  // Student attempts, notes, question text/answer and storage keys are absent.
  const [assetRows, questionRows, assessmentRows] = await Promise.all([
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
    db.select({
      courseId: courseLearningAssessments.courseId,
      reviewStatus: courseLearningAssessments.reviewStatus,
      total: count(),
    }).from(courseLearningAssessments).where(
      inArray(courseLearningAssessments.courseId, courseIds),
    ).groupBy(courseLearningAssessments.courseId,
      courseLearningAssessments.reviewStatus),
  ]);
  const readyByCourse = new Map(assetRows.map((row) =>
    [row.courseId, row.readyVideos] as const));
  const reviewByCourse = new Map(questionRows.map((row) =>
    [row.courseId, row.reviewStatus] as const));
  const assessmentsByCourse = new Map<string, {
    pending: number;
    approved: number;
    rejected: number;
  }>();
  for (const row of assessmentRows) {
    const counts = assessmentsByCourse.get(row.courseId) ?? {
      pending: 0, approved: 0, rejected: 0,
    };
    counts[row.reviewStatus] = row.total;
    assessmentsByCourse.set(row.courseId, counts);
  }
  return {
    courses: visible.map((course) => ({
      ...course,
      readyVideos: readyByCourse.get(course.courseId) ?? 0,
      practiceReviewStatus: reviewByCourse.get(course.courseId) ??
        ("not_created" as const),
      learningAssessmentReviews: assessmentsByCourse.get(course.courseId) ?? {
        pending: 0, approved: 0, rejected: 0,
      },
    })),
    hasMore: rows.length > 20,
    nextCursor: rows.length > 20
      ? encodeInstituteCourseCursor(visible[visible.length - 1]!)
      : null,
    invalidCursor: false,
  };
}
