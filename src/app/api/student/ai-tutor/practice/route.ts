import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { assessmentExamAttempts } from "@/db/schema";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import { getSeedPractice, gradeSeedPractice, isSeedTopicId } from "@/server/ai-tutor/seed-corpus";
import { hasStudentEntitlement } from "@/server/student/entitlement";
import {
  getLatestStudentTutorTopic, getStudentTutorPracticeStats,
  recordStudentTutorPracticeOutcome,
} from "@/server/student/ai-tutor-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const answerSchema = z.object({
  courseId: z.uuid(),
  questionId: z.string().min(1).max(100),
  topicId: z.string().optional(),
  selectedOption: z.number().int().min(0).max(3),
  rememberResult: z.boolean().optional(),
}).strict();

async function activeExam(studentUserId: string) {
  const [attempt] = await getDb().select({ id: assessmentExamAttempts.id })
    .from(assessmentExamAttempts)
    .where(and(
      eq(assessmentExamAttempts.studentUserId, studentUserId),
      eq(assessmentExamAttempts.status, "in_progress"),
    )).limit(1);
  return Boolean(attempt);
}

export async function GET(request: NextRequest) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const parsedCourse = z.uuid().safeParse(request.nextUrl.searchParams.get("courseId"));
  if (!parsedCourse.success ||
      !await hasStudentEntitlement(actor.userId, parsedCourse.data)) {
    return NextResponse.json({ error: "Course unavailable" }, {
      status: 404, headers: noStore,
    });
  }
  if (await activeExam(actor.userId)) {
    return NextResponse.json({ error: "Tutor practice is unavailable during an active exam" }, {
      status: 403, headers: noStore,
    });
  }
  const requestedTopicId = request.nextUrl.searchParams.get("topicId");
  const topicId = requestedTopicId
    ? (isSeedTopicId(requestedTopicId) ? requestedTopicId : null)
    : await getLatestStudentTutorTopic(actor.userId);
  if (!topicId) return NextResponse.json({ error: "No saved topic" }, {
    status: 404, headers: noStore,
  });
  const stats = await getStudentTutorPracticeStats(actor.userId, topicId);
  if (!stats) return NextResponse.json({ error: "Practice unavailable" }, {
    status: 404, headers: noStore,
  });
  const practice = getSeedPractice(topicId);
  const guided = stats?.practiceNeedsGuidance ?? false;
  return NextResponse.json({
    questionId: practice.id,
    topicId: practice.topicId,
    topicTitle: practice.topicTitle,
    prompt: practice.prompt,
    options: practice.options,
    guidedHint: guided ? practice.guidedHint : null,
  }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const parsed = answerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answer" }, {
    status: 400, headers: noStore,
  });
  if (!await hasStudentEntitlement(actor.userId, parsed.data.courseId)) {
    return NextResponse.json({ error: "Course unavailable" }, {
      status: 404, headers: noStore,
    });
  }
  if (await activeExam(actor.userId)) {
    return NextResponse.json({ error: "Tutor practice is unavailable during an active exam" }, {
      status: 403, headers: noStore,
    });
  }
  const topicId = parsed.data.topicId
    ? (isSeedTopicId(parsed.data.topicId) ? parsed.data.topicId : null)
    : await getLatestStudentTutorTopic(actor.userId);
  const stats = topicId
    ? await getStudentTutorPracticeStats(actor.userId, topicId)
    : null;
  if (!topicId || !stats || getSeedPractice(topicId).id !== parsed.data.questionId) {
    return NextResponse.json({ error: "Practice unavailable" }, {
      status: 404, headers: noStore,
    });
  }
  const result = gradeSeedPractice(parsed.data.questionId, parsed.data.selectedOption);
  if (!result) return NextResponse.json({ error: "Practice unavailable" }, {
    status: 404, headers: noStore,
  });
  const resultRecorded = parsed.data.rememberResult === true &&
    await recordStudentTutorPracticeOutcome(actor.userId, topicId, result.correct);
  return NextResponse.json({ ...result, resultRecorded }, { headers: noStore });
}
