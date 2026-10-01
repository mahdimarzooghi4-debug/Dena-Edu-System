import { and, asc, count, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseLearningAssessments, coursePracticeQuestions, courses,
  privateMediaAssets, providerInstituteCollaborations, supervisionGrants,
  verifiedEntities,
} from "../../db/schema";

const providerDashboardInstitute = alias(verifiedEntities, "provider_dashboard_institute");

const providerCourseCursorSchema = z.object({
  requestedAt: z.string().datetime(),
  courseId: z.uuid(),
}).strict();

export function encodeProviderCourseCursor(input: {
  requestedAt: Date;
  courseId: string;
}) {
  return Buffer.from(JSON.stringify({
    requestedAt: input.requestedAt.toISOString(),
    courseId: input.courseId,
  })).toString("base64url");
}

export function decodeProviderCourseCursor(token: string) {
  if (token.length > 1024) return null;
  try {
    const parsed = providerCourseCursorSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    return { requestedAt: new Date(parsed.data.requestedAt),
      courseId: parsed.data.courseId };
  } catch {
    return null;
  }
}

/** Scoped display only; publication and ingest must reauthorize transactionally. */
export async function getProviderDashboardCourses(
  providerIds: readonly string[], cursorToken?: string,
) {
  if (!providerIds.length) {
    return { courses: [], hasMore: false, nextCursor: null, invalidCursor: false };
  }
  const cursor = cursorToken ? decodeProviderCourseCursor(cursorToken) : null;
  if (cursorToken && !cursor) {
    return { courses: [], hasMore: false, nextCursor: null, invalidCursor: true };
  }
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    instituteName: providerDashboardInstitute.name,
    providerCollaborationApproved: sql<boolean>`exists (
      select 1 from ${providerInstituteCollaborations}
      where ${providerInstituteCollaborations.providerId} = ${courses.providerId}
        and ${providerInstituteCollaborations.instituteId} = ${courses.responsibleInstituteId}
        and ${providerInstituteCollaborations.status} = 'approved'
    )`,
    supervisionStatus: supervisionGrants.status,
    publicationStatus: courses.publicationStatus,
    requestedAt: supervisionGrants.requestedAt,
  }).from(courses).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.providerId, courses.providerId),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).innerJoin(providerDashboardInstitute, and(
    eq(providerDashboardInstitute.id, courses.responsibleInstituteId),
    eq(providerDashboardInstitute.role, "institute"),
  )).where(and(
    inArray(courses.providerId, [...providerIds]),
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
  const visibleIds = visible.map((course) => course.courseId);
  // Separate metadata-only queries prevent join fan-out from inflating counts.
  // None fetches student attempts, notes, answer keys or object keys.
  const [assets, questions, assessmentRows] = await Promise.all([
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
    db.select({
      courseId: courseLearningAssessments.courseId,
      reviewStatus: courseLearningAssessments.reviewStatus,
      total: count(),
    }).from(courseLearningAssessments).where(
      inArray(courseLearningAssessments.courseId, visibleIds),
    ).groupBy(courseLearningAssessments.courseId,
      courseLearningAssessments.reviewStatus),
  ]);
  const readyByCourse = new Map(assets.map((item) =>
    [item.courseId, item.readyVideos] as const));
  const reviewByCourse = new Map(questions.map((item) =>
    [item.courseId, item.reviewStatus] as const));
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
      ? encodeProviderCourseCursor(visible[visible.length - 1]!)
      : null,
    invalidCursor: false,
  };
}
