import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import { getDb } from "@/db";
import { assessmentExamAttempts } from "@/db/schema";
import { hasStudentEntitlement } from "@/server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const requestSchema = z.object({
  courseId: z.uuid(),
  message: z.string().trim().min(1).max(3000),
}).strict();

/**
 * First server boundary for the student AI tutor.
 *
 * Model retrieval, quota reservation and response generation are intentionally
 * unavailable until the content index, usage package and model adapter are
 * configured. Keep the exam gate here before those integrations are called.
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

  // Fail closed until the approved content corpus, paid usage ledger and
  // provider-neutral model adapter are implemented and configured.
  return NextResponse.json({
    error: "AI tutor is not configured yet",
    code: "AI_TUTOR_UNAVAILABLE",
  }, { status: 503, headers: noStore });
}
