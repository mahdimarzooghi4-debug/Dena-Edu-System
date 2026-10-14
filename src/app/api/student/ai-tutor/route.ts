import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import { getDb } from "@/db";
import { assessmentExamAttempts } from "@/db/schema";
import { hasStudentEntitlement } from "@/server/student/entitlement";
import {
  answerFromSeedCorpus, applySeedPracticeGuidance, getSeedPractice, isSeedTopicId, SEED_CORPUS_VERSION,
} from "@/server/ai-tutor/seed-corpus";
import {
  getStudentTutorPracticeStats, recordStudentTutorTopic,
} from "@/server/student/ai-tutor-profile";
import { retrieveStudentVideoTranscript } from "@/server/ai-tutor/video-transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const requestSchema = z.object({
  courseId: z.uuid(),
  message: z.string().trim().min(1).max(3000),
  rememberTopic: z.boolean().optional(),
}).strict();

/**
 * Internal starter-corpus tutor boundary. Entitlement and active-exam checks
 * run before retrieval; only an opt-in topic ID can be persisted, never text.
 */
export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }

  const actor = await getServerAccessContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  if (!await hasStudentEntitlement(actor.userId, parsed.data.courseId)) {
    return NextResponse.json({ error: "Course unavailable" }, { status: 404, headers: noStore });
  }

  // This query covers both institute_planned and dena_coordinated exams: the
  // attempt table is shared, and an in-progress attempt blocks tutor requests.
  const [activeAttempt] = await getDb().select({ id: assessmentExamAttempts.id })
    .from(assessmentExamAttempts)
    .where(and(
      eq(assessmentExamAttempts.studentUserId, actor.userId),
      eq(assessmentExamAttempts.status, "in_progress"),
    ))
    .limit(1);

  if (activeAttempt) {
    return NextResponse.json({
      error: "AI tutor is unavailable during an active exam",
      code: "ACTIVE_EXAM",
    }, { status: 403, headers: noStore });
  }

  // Prefer a relevant, permission-checked course transcript. The small
  // Dena-authored starter corpus is the fallback when no course video matches.
  // No external model is called and unsupported questions are not generated.
  const videoResult = await retrieveStudentVideoTranscript(
    actor.userId, parsed.data.courseId, parsed.data.message,
  );
  if (videoResult) {
    const conceptId = videoResult.source.conceptId;
    const savedTopicId = conceptId && isSeedTopicId(conceptId) ? conceptId : null;
    const practiceStats = savedTopicId
      ? await getStudentTutorPracticeStats(actor.userId, savedTopicId)
      : null;
    const guidedHint = savedTopicId && practiceStats?.practiceNeedsGuidance
      ? getSeedPractice(savedTopicId).guidedHint
      : null;
    const topicId = parsed.data.rememberTopic === true ? savedTopicId : null;
    if (topicId) await recordStudentTutorTopic(actor.userId, topicId);
    return NextResponse.json({
      ...videoResult,
      topicRecorded: Boolean(topicId),
      ...(topicId ? { topicId } : {}),
      ...(guidedHint ? { guidedHint } : {}),
    }, { headers: noStore });
  }

  const result = answerFromSeedCorpus(parsed.data.message);
  if (!result) {
    return NextResponse.json({
      error: "برای این پرسش هنوز محتوای آموزشی آماده ندارم.",
      code: "STARTER_CONTENT_NOT_FOUND",
      corpusVersion: SEED_CORPUS_VERSION,
    }, { status: 422, headers: noStore });
  }

  const practiceStats = await getStudentTutorPracticeStats(
    actor.userId, result.source.id,
  );
  const personalizedResult = applySeedPracticeGuidance(
    result, practiceStats?.practiceNeedsGuidance ?? false,
  );

  const topicRecorded = parsed.data.rememberTopic === true;
  if (topicRecorded) {
    await recordStudentTutorTopic(actor.userId, result.source.id);
  }
  return NextResponse.json({
    ...personalizedResult,
    topicRecorded,
    ...(topicRecorded ? { topicId: result.source.id } : {}),
  }, { headers: noStore });
}
