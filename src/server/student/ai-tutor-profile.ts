import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { studentAiTutorTopics } from "../../db/schema";
import type { SeedTopicId } from "../ai-tutor/seed-corpus";

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
