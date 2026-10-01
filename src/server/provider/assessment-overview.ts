import { and, asc, desc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { courseLearningAssessments, courses, supervisionGrants } from "../../db/schema";

const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  assessmentId: z.uuid(),
}).strict();

function encodeCursor(input: { createdAt: Date; assessmentId: string }) {
  return Buffer.from(JSON.stringify({
    createdAt: input.createdAt.toISOString(),
    assessmentId: input.assessmentId,
  })).toString("base64url");
}

function decodeCursor(token: string) {
  if (!token || token.length > 1024) return null;
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    return { createdAt: new Date(parsed.data.createdAt),
      assessmentId: parsed.data.assessmentId };
  } catch {
    return null;
  }
}

/** Metadata-only assessment index, scoped to active provider IDs from session. */
export async function getProviderAssessmentOverview(
  providerIds: readonly string[], cursorToken?: string,
) {
  if (!providerIds.length) {
    return { assessments: [], nextCursor: null, invalidCursor: false };
  }
  const cursor = cursorToken ? decodeCursor(cursorToken) : null;
  if (cursorToken && !cursor) {
    return { assessments: [], nextCursor: null, invalidCursor: true };
  }
  const rows = await getDb().select({
    assessmentId: courseLearningAssessments.id,
    assessmentTitle: courseLearningAssessments.title,
    questionCount: courseLearningAssessments.questionCount,
    reviewStatus: courseLearningAssessments.reviewStatus,
    createdAt: courseLearningAssessments.createdAt,
    courseId: courses.id,
    courseTitle: courses.title,
    supervisionStatus: supervisionGrants.status,
  }).from(courseLearningAssessments).innerJoin(courses, eq(
    courses.id, courseLearningAssessments.courseId,
  )).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.providerId, courses.providerId),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).where(and(
    inArray(courses.providerId, [...providerIds]),
    ...(cursor ? [or(
      lt(courseLearningAssessments.createdAt, cursor.createdAt),
      and(
        eq(courseLearningAssessments.createdAt, cursor.createdAt),
        gt(courseLearningAssessments.id, cursor.assessmentId),
      ),
    )!] : []),
  )).orderBy(desc(courseLearningAssessments.createdAt),
    asc(courseLearningAssessments.id)).limit(21);
  const visible = rows.slice(0, 20);
  const last = visible.at(-1);
  return {
    assessments: visible,
    nextCursor: rows.length > 20 && last
      ? encodeCursor({ createdAt: last.createdAt, assessmentId: last.assessmentId })
      : null,
    invalidCursor: false,
  };
}
