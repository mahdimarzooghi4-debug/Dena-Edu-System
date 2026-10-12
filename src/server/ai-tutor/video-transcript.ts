import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  denaAiVideoTranscriptChunks, privateMediaAssets, courses,
} from "@/db/schema";
import { hasStudentEntitlement } from "@/server/student/entitlement";

const stopWords = new Set([
  "از", "به", "با", "در", "برای", "را", "که", "این", "آن", "و", "یا",
  "چطور", "چگونه", "است", "هست", "می", "شود", "کنیم", "کنم", "کنند",
  "یک", "چه", "چرا", "اگر", "تا", "روی", "هم", "من", "تو",
]);

function terms(value: string): string[] {
  return [...new Set((value.normalize("NFKC").toLocaleLowerCase("fa-IR")
    .replace(/[يى]/gu, "ی").replace(/ك/gu, "ک")
    .match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((term) => term.length > 1 && !stopWords.has(term)))];
}

/**
 * Deterministic excerpt retrieval. The caller still checks active-exam state;
 * this function independently rechecks the student's course entitlement and
 * the latest per-video grant before reading any transcript text.
 */
export async function retrieveStudentVideoTranscript(
  studentUserId: string,
  courseId: string,
  question: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  const questionTerms = terms(question);
  if (questionTerms.length < 2) return null;

  const rows = await getDb().select({
    assetId: denaAiVideoTranscriptChunks.assetId,
    chunkIndex: denaAiVideoTranscriptChunks.chunkIndex,
    chunkText: denaAiVideoTranscriptChunks.chunkText,
    title: privateMediaAssets.title,
  }).from(denaAiVideoTranscriptChunks)
    .innerJoin(privateMediaAssets, and(
      eq(privateMediaAssets.id, denaAiVideoTranscriptChunks.assetId),
      eq(privateMediaAssets.courseId, denaAiVideoTranscriptChunks.courseId),
    ))
    .innerJoin(courses, eq(courses.id, privateMediaAssets.courseId))
    .where(and(
      eq(denaAiVideoTranscriptChunks.courseId, courseId),
      eq(privateMediaAssets.status, "ready"),
      eq(courses.ownerType, "institute"),
      sql`EXISTS (
        SELECT 1 FROM dena_ai_content_permission_events AS granted
        WHERE granted.asset_id = ${privateMediaAssets.id}
          AND granted.course_id = ${privateMediaAssets.courseId}
          AND granted.decision = 'granted'
          AND NOT EXISTS (
            SELECT 1 FROM dena_ai_content_permission_events AS newer
            WHERE newer.asset_id = granted.asset_id
              AND newer.course_id = granted.course_id
              AND (newer.created_at, newer.id) > (granted.created_at, granted.id)
          )
      )`,
    ))
    .limit(100);

  const ranked = rows.map((row) => {
    const chunkTerms = new Set(terms(row.chunkText));
    return {
      ...row,
      score: questionTerms.reduce((score, term) =>
        score + (chunkTerms.has(term) ? 1 : 0), 0),
    };
  }).filter((row) => row.score >= Math.min(2, questionTerms.length))
    .sort((a, b) => b.score - a.score ||
      a.assetId.localeCompare(b.assetId) || a.chunkIndex - b.chunkIndex);
  const best = ranked[0];
  if (!best) return null;

  return {
    answer: `در متن پیاده‌سازی‌شدهٔ ویدئوی «${best.title}» این بخش مرتبط پیدا شد:\n\n«${best.chunkText}»`,
    source: { id: best.assetId, title: best.title },
  };
}
