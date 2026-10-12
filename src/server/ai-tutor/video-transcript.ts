import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  denaAiVideoTranscriptChunks, privateMediaAssets, courses,
} from "@/db/schema";
import { listStudentTutorVideoGuidanceAssets, listStudentTutorVideoGuidanceConceptIds } from "@/server/student/ai-tutor-profile";
import { hasStudentEntitlement } from "@/server/student/entitlement";

const supervisedEducatorScope = sql`EXISTS (
  SELECT 1
  FROM dena_educator_institute_affiliations AS affiliation
  JOIN dena_supervision_grants AS supervision
    ON supervision.course_id = dena_courses.id
   AND supervision.owner_type = 'independent_educator'
   AND supervision.independent_educator_profile_id = dena_courses.independent_educator_profile_id
   AND supervision.institute_id = dena_courses.responsible_institute_id
  WHERE affiliation.educator_profile_id = dena_courses.independent_educator_profile_id
    AND affiliation.institute_id = dena_courses.responsible_institute_id
    AND affiliation.status = 'approved'
    AND supervision.status = 'approved'
    AND supervision.approved_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dena_memberships AS approver
      WHERE approver.user_id = supervision.approved_by_institute_user_id
        AND approver.role = 'institute'
        AND approver.institute_id = dena_courses.responsible_institute_id
        AND approver.status = 'active'
    )
)`;
function activePermissionSql() {
  return sql`EXISTS (
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
  )`;
}
function activeOwnerSql() {
  return or(
    eq(courses.ownerType, "institute"),
    and(eq(courses.ownerType, "independent_educator"), supervisedEducatorScope),
  );
}

/** Used before storing private feedback about a currently accessible video. */
export async function isStudentVideoTutorSourceAvailable(
  studentUserId: string,
  courseId: string,
  assetId: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return false;
  const [source] = await getDb().select({ id: privateMediaAssets.id })
    .from(privateMediaAssets)
    .innerJoin(courses, eq(courses.id, privateMediaAssets.courseId))
    .where(and(
      eq(privateMediaAssets.id, assetId),
      eq(privateMediaAssets.courseId, courseId),
      eq(privateMediaAssets.status, "ready"),
      activeOwnerSql(),
      activePermissionSql(),
      sql`EXISTS (
        SELECT 1 FROM dena_ai_video_transcript_chunks AS chunk
        WHERE chunk.asset_id = ${privateMediaAssets.id}
          AND chunk.course_id = ${privateMediaAssets.courseId}
      )`,
    ))
    .limit(1);
  return Boolean(source);
}

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

  const guidanceAssets = new Set((await listStudentTutorVideoGuidanceAssets(
    studentUserId, courseId,
  )).map((row) => row.assetId));
  const guidanceConceptIds = new Set(await listStudentTutorVideoGuidanceConceptIds(
    studentUserId, courseId,
  ));
  const rows = await getDb().select({
    conceptId: denaAiVideoTranscriptChunks.learningConceptId,
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
      or(
        eq(courses.ownerType, "institute"),
        and(
          eq(courses.ownerType, "independent_educator"),
          sql`EXISTS (
            SELECT 1
            FROM dena_educator_institute_affiliations AS affiliation
            JOIN dena_supervision_grants AS supervision
              ON supervision.course_id = dena_courses.id
             AND supervision.owner_type = 'independent_educator'
             AND supervision.independent_educator_profile_id =
                 dena_courses.independent_educator_profile_id
             AND supervision.institute_id = dena_courses.responsible_institute_id
            WHERE affiliation.educator_profile_id =
                    dena_courses.independent_educator_profile_id
              AND affiliation.institute_id = dena_courses.responsible_institute_id
              AND affiliation.status = 'approved'
              AND supervision.status = 'approved'
              AND supervision.approved_at IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM dena_memberships AS approver
                WHERE approver.user_id = supervision.approved_by_institute_user_id
                  AND approver.role = 'institute'
                  AND approver.institute_id = dena_courses.responsible_institute_id
                  AND approver.status = 'active'
              )
          )`,
        ),
      ),
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
      needsGuidance: guidanceAssets.has(row.assetId),
      conceptNeedsGuidance: Boolean(row.conceptId && guidanceConceptIds.has(row.conceptId)),
    };
  }).filter((row) => row.score >= Math.min(2, questionTerms.length))
    .sort((a, b) => b.score - a.score ||
      Number(b.needsGuidance || b.conceptNeedsGuidance) - Number(a.needsGuidance || a.conceptNeedsGuidance) ||
      a.assetId.localeCompare(b.assetId) || a.chunkIndex - b.chunkIndex);
  const best = ranked[0];
  if (!best) return null;

  return {
    answer: `در متن پیاده‌سازی‌شدهٔ ویدئوی «${best.title}» این بخش مرتبط پیدا شد:\n\n«${best.chunkText}»`,
    source: { id: best.assetId, title: best.title, kind: "video" as const, conceptId: best.conceptId },
  };
}
