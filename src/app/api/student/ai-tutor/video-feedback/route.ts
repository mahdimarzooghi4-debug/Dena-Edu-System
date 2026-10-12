import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { assessmentExamAttempts } from "@/db/schema";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import { isStudentVideoTutorSourceAvailable } from "@/server/ai-tutor/video-transcript";
import { recordStudentTutorVideoFeedback } from "@/server/student/ai-tutor-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const feedbackSchema = z.object({
  courseId: z.uuid(),
  assetId: z.uuid(),
  needsGuidance: z.boolean(),
}).strict();

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
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback" }, {
    status: 400, headers: noStore,
  });
  if (!await isStudentVideoTutorSourceAvailable(
    actor.userId, parsed.data.courseId, parsed.data.assetId,
  )) {
    return NextResponse.json({ error: "Video source unavailable" }, {
      status: 404, headers: noStore,
    });
  }
  const [activeAttempt] = await getDb().select({ id: assessmentExamAttempts.id })
    .from(assessmentExamAttempts)
    .where(and(
      eq(assessmentExamAttempts.studentUserId, actor.userId),
      eq(assessmentExamAttempts.status, "in_progress"),
    ))
    .limit(1);
  if (activeAttempt) return NextResponse.json({
    error: "Tutor feedback is unavailable during an active exam",
    code: "ACTIVE_EXAM",
  }, { status: 403, headers: noStore });

  await recordStudentTutorVideoFeedback(
    actor.userId, parsed.data.courseId, parsed.data.assetId,
    parsed.data.needsGuidance,
  );
  return NextResponse.json({ saved: true }, { headers: noStore });
}
