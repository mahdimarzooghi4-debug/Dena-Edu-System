import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../server/access/role-application-contracts";
import { LearningAssessmentUnavailable, startStudentLearningAssessment } from "../../../../../../../../server/assessments/learning-assessment";
import { hasStudentEntitlement } from "../../../../../../../../server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string; assessmentId: string }> };

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { courseId, assessmentId } = await params.params;
  if (!z.uuid().safeParse(courseId).success || !z.uuid().safeParse(assessmentId).success ||
      !await hasStudentEntitlement(actor.userId, courseId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const body = await request.json().catch(() => null);
  if (!z.object({}).strict().safeParse(body).success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  try {
    const result = await startStudentLearningAssessment(actor.userId, courseId, assessmentId);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
    return NextResponse.json(result, { status: "attemptId" in result &&
      "resumed" in result && !result.resumed ? 201 : 200,
      headers: noStore });
  } catch (error) {
    if (error instanceof LearningAssessmentUnavailable) {
      return NextResponse.json({ error: error.kind }, { status: 409, headers: noStore });
    }
    throw error;
  }
}
