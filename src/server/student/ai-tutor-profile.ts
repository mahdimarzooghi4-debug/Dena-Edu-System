import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { studentAiTutorTopics } from "../../db/schema";
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
    firstAskedAt: studentAiTutorTopics.firstAskedAt,
    lastAskedAt: studentAiTutorTopics.lastAskedAt,
  }).from(studentAiTutorTopics)
    .where(eq(studentAiTutorTopics.studentUserId, studentUserId))
    .orderBy(desc(studentAiTutorTopics.lastAskedAt));
}

export async function clearStudentTutorTopics(studentUserId: string) {
  const deleted = await getDb().delete(studentAiTutorTopics)
    .where(eq(studentAiTutorTopics.studentUserId, studentUserId))
    .returning({ topicId: studentAiTutorTopics.topicId });
  return deleted.length;
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
  }).where(and(
    eq(studentAiTutorTopics.studentUserId, studentUserId),
    eq(studentAiTutorTopics.topicId, topicId),
  )).returning({ topicId: studentAiTutorTopics.topicId });
  return rows.length > 0;
}
