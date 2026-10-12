import { and, asc, count, eq, gt, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseLearningAssessments, coursePracticeQuestions, courses, supervisionGrants,
} from "../../db/schema";

const cursorSchema = z.object({ createdAt: z.string().datetime(), id: z.uuid() }).strict();

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }))
    .toString("base64url");
}

function decodeCursor(token: string) {
  if (!token || token.length > 1024) return null;
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    return parsed.success
      ? { createdAt: new Date(parsed.data.createdAt), id: parsed.data.id }
      : null;
  } catch {
    return null;
  }
}

/** Metadata-only queues; the review pages reauthorize each decision. */
export async function getInstituteAssessmentQueue(
  instituteIds: readonly string[], cursors: {
    practice?: string; learning?: string;
  } = {},
) {
  const empty = {
    practicePendingCount: 0, learningPendingCount: 0,
    practice: [], learning: [], nextPracticeCursor: null,
    nextLearningCursor: null, invalidCursor: false,
  } as const;
  if (!instituteIds.length) return empty;
  const practiceCursor = cursors.practice ? decodeCursor(cursors.practice) : null;
  const learningCursor = cursors.learning ? decodeCursor(cursors.learning) : null;
  if ((cursors.practice && !practiceCursor) || (cursors.learning && !learningCursor)) {
    return { ...empty, invalidCursor: true };
  }
  const db = getDb();
  const reviewableCourse = and(
    inArray(supervisionGrants.instituteId, [...instituteIds]),
    eq(supervisionGrants.status, "approved"),
    eq(courses.publicationStatus, "draft"),
  );
  const [practiceCountRows, learningCountRows, practiceRows, learningRows] =
    await Promise.all([
      db.select({ total: count() }).from(coursePracticeQuestions)
        .innerJoin(courses, eq(courses.id, coursePracticeQuestions.courseId))
        .innerJoin(supervisionGrants, and(
          eq(supervisionGrants.courseId, courses.id),
          eq(supervisionGrants.providerId, courses.providerId),
          eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        )).where(and(reviewableCourse,
          eq(coursePracticeQuestions.reviewStatus, "pending"))),
      db.select({ total: count() }).from(courseLearningAssessments)
        .innerJoin(courses, eq(courses.id, courseLearningAssessments.courseId))
        .innerJoin(supervisionGrants, and(
          eq(supervisionGrants.courseId, courses.id),
          eq(supervisionGrants.providerId, courses.providerId),
          eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        )).where(and(reviewableCourse,
          eq(courseLearningAssessments.reviewStatus, "pending"))),
      db.select({
        id: coursePracticeQuestions.courseId,
        courseId: courses.id,
        courseTitle: courses.title,
        createdAt: coursePracticeQuestions.createdAt,
      }).from(coursePracticeQuestions)
        .innerJoin(courses, eq(courses.id, coursePracticeQuestions.courseId))
        .innerJoin(supervisionGrants, and(
          eq(supervisionGrants.courseId, courses.id),
          eq(supervisionGrants.providerId, courses.providerId),
          eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        )).where(and(
          reviewableCourse,
          eq(coursePracticeQuestions.reviewStatus, "pending"),
          ...(practiceCursor ? [or(
            gt(coursePracticeQuestions.createdAt, practiceCursor.createdAt),
            and(
              eq(coursePracticeQuestions.createdAt, practiceCursor.createdAt),
              gt(coursePracticeQuestions.courseId, practiceCursor.id),
            ),
          )!] : []),
        )).orderBy(asc(coursePracticeQuestions.createdAt),
          asc(coursePracticeQuestions.courseId)).limit(21),
      db.select({
        id: courseLearningAssessments.id,
        courseId: courses.id,
        courseTitle: courses.title,
        title: courseLearningAssessments.title,
        questionCount: courseLearningAssessments.questionCount,
        createdAt: courseLearningAssessments.createdAt,
      }).from(courseLearningAssessments)
        .innerJoin(courses, eq(courses.id, courseLearningAssessments.courseId))
        .innerJoin(supervisionGrants, and(
          eq(supervisionGrants.courseId, courses.id),
          eq(supervisionGrants.providerId, courses.providerId),
          eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        )).where(and(
          reviewableCourse,
          eq(courseLearningAssessments.reviewStatus, "pending"),
          ...(learningCursor ? [or(
            gt(courseLearningAssessments.createdAt, learningCursor.createdAt),
            and(
              eq(courseLearningAssessments.createdAt, learningCursor.createdAt),
              gt(courseLearningAssessments.id, learningCursor.id),
            ),
          )!] : []),
        )).orderBy(asc(courseLearningAssessments.createdAt),
          asc(courseLearningAssessments.id)).limit(21),
    ]);
  const practice = practiceRows.slice(0, 20);
  const learning = learningRows.slice(0, 20);
  const lastPractice = practice.at(-1);
  const lastLearning = learning.at(-1);
  return {
    practicePendingCount: practiceCountRows[0]?.total ?? 0,
    learningPendingCount: learningCountRows[0]?.total ?? 0,
    practice,
    learning,
    nextPracticeCursor: practiceRows.length > 20 && lastPractice
      ? encodeCursor(lastPractice.createdAt, lastPractice.id) : null,
    nextLearningCursor: learningRows.length > 20 && lastLearning
      ? encodeCursor(lastLearning.createdAt, lastLearning.id) : null,
    invalidCursor: false,
  };
}
