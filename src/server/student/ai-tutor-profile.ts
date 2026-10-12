import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { denaAiVideoTranscriptChunks, studentAiTutorTopics, studentAiTutorVideoFeedback } from "../../db/schema";
import { isSeedTopicId, type SeedTopicId } from "../ai-tutor/seed-corpus";

export async function recordStudentTutorTopic(
  studentUserId: string,
  topicId: SeedTopicId,
) {
  await getDb().insert(studentAiTutorTopics).values({ studentUserId, topicId })
    .onConflictDoUpdate({
      target: [studentAiTutorTopics.studentUserId, studentAiTutorTopics.topicId],
      set: {
        questionCount: sql`LEAST(${studentAiTutorTopics.questionCount} + 1, 10000)`,
        lastAskedAt: new Date(),
      },
    });
}

export async function listStudentTutorTopics(studentUserId: string) {
  return getDb().select({
    topicId: studentAiTutorTopics.topicId,
    questionCount: studentAiTutorTopics.questionCount,
    practiceAttemptCount: studentAiTutorTopics.practiceAttemptCount,
    practiceCorrectCount: studentAiTutorTopics.practiceCorrectCount,
    practiceNeedsGuidance: studentAiTutorTopics.practiceNeedsGuidance,
    firstAskedAt: studentAiTutorTopics.firstAskedAt,
    lastAskedAt: studentAiTutorTopics.lastAskedAt,
  }).from(studentAiTutorTopics)
    .where(eq(studentAiTutorTopics.studentUserId, studentUserId))
    .orderBy(desc(studentAiTutorTopics.lastAskedAt));
}

export async function listStudentTutorVideoGuidanceAssets(
  studentUserId: string,
  courseId: string,
) {
  return getDb().select({ assetId: studentAiTutorVideoFeedback.assetId })
    .from(studentAiTutorVideoFeedback)
    .where(and(
      eq(studentAiTutorVideoFeedback.studentUserId, studentUserId),
      ...(courseId ? [eq(studentAiTutorVideoFeedback.courseId, courseId)] : []),
      eq(studentAiTutorVideoFeedback.needsGuidance, true),
    ));
}

export async function listStudentTutorVideoGuidanceConceptIds(
  studentUserId: string,
  courseId?: string,
) {
  const rows = await getDb().selectDistinct({
    conceptId: denaAiVideoTranscriptChunks.learningConceptId,
  }).from(studentAiTutorVideoFeedback)
    .innerJoin(denaAiVideoTranscriptChunks, and(
      eq(denaAiVideoTranscriptChunks.assetId, studentAiTutorVideoFeedback.assetId),
      eq(denaAiVideoTranscriptChunks.courseId, studentAiTutorVideoFeedback.courseId),
    ))
    .where(and(
      eq(studentAiTutorVideoFeedback.studentUserId, studentUserId),
      ...(courseId ? [eq(studentAiTutorVideoFeedback.courseId, courseId)] : []),
      eq(studentAiTutorVideoFeedback.needsGuidance, true),
      sql`${denaAiVideoTranscriptChunks.learningConceptId} IS NOT NULL`,
    ));
  return rows.map((row) => row.conceptId).filter((id): id is string => id !== null);
}
export async function recordStudentTutorVideoFeedback(
  studentUserId: string,
  courseId: string,
  assetId: string,
  needsGuidance: boolean,
) {
  await getDb().insert(studentAiTutorVideoFeedback).values({
    studentUserId, courseId, assetId, needsGuidance,
  }).onConflictDoUpdate({
    target: [
      studentAiTutorVideoFeedback.studentUserId,
      studentAiTutorVideoFeedback.courseId,
      studentAiTutorVideoFeedback.assetId,
    ],
    set: { needsGuidance, updatedAt: new Date() },
  });
}

export async function clearStudentTutorTopics(studentUserId: string) {
  const deleted = await getDb().delete(studentAiTutorTopics)
    .where(eq(studentAiTutorTopics.studentUserId, studentUserId))
    .returning({ topicId: studentAiTutorTopics.topicId });
  const videoFeedback = await getDb().delete(studentAiTutorVideoFeedback)
    .where(eq(studentAiTutorVideoFeedback.studentUserId, studentUserId))
    .returning({ assetId: studentAiTutorVideoFeedback.assetId });
  return deleted.length + videoFeedback.length;
}

export async function getLatestStudentTutorTopic(
  studentUserId: string,
): Promise<SeedTopicId | null> {
  const [row] = await getDb().select({ topicId: studentAiTutorTopics.topicId })
    .from(studentAiTutorTopics)
    .where(eq(studentAiTutorTopics.studentUserId, studentUserId))
    .orderBy(desc(studentAiTutorTopics.lastAskedAt), asc(studentAiTutorTopics.topicId))
    .limit(1);
  return row && isSeedTopicId(row.topicId) ? row.topicId : null;
}

export async function getStudentTutorPracticeStats(
  studentUserId: string,
  topicId: SeedTopicId,
) {
  const [row] = await getDb().select({
    practiceAttemptCount: studentAiTutorTopics.practiceAttemptCount,
    practiceCorrectCount: studentAiTutorTopics.practiceCorrectCount,
    practiceNeedsGuidance: studentAiTutorTopics.practiceNeedsGuidance,
  }).from(studentAiTutorTopics).where(and(
    eq(studentAiTutorTopics.studentUserId, studentUserId),
    eq(studentAiTutorTopics.topicId, topicId),
  )).limit(1);
  return row ?? null;
}

export async function recordStudentTutorPracticeOutcome(
  studentUserId: string,
  topicId: SeedTopicId,
  correct: boolean,
) {
  const rows = await getDb().update(studentAiTutorTopics).set({
    practiceAttemptCount: sql`LEAST(${studentAiTutorTopics.practiceAttemptCount} + 1, 10000)`,
    practiceCorrectCount: sql`LEAST(${studentAiTutorTopics.practiceCorrectCount} + ${correct ? 1 : 0}, 10000)`,
    practiceNeedsGuidance: !correct,
  }).where(and(
    eq(studentAiTutorTopics.studentUserId, studentUserId),
    eq(studentAiTutorTopics.topicId, topicId),
  )).returning({ topicId: studentAiTutorTopics.topicId });
  return rows.length > 0;
}
