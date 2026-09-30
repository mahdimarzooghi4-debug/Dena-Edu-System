import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../../server/access/role-application-contracts";
import { LearningAssessmentUnavailable, getStudentLearningAssessmentAttempt, learningAssessmentAnswers, submitStudentLearningAssessment } from "../../../../../../../../../server/assessments/learning-assessment";
import { hasStudentEntitlement } from "../../../../../../../../../server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string; assessmentId: string; attemptId: string }> };

async function authorized(params: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore }) };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore }) };
  }
  const values = await params.params;
  if (![values.courseId, values.assessmentId, values.attemptId].every((id) => z.uuid().safeParse(id).success) ||
      !await hasStudentEntitlement(actor.userId, values.courseId)) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore }) };
  }
  return { actor, values };
}

export async function GET(_request: NextRequest, params: Params) {
  const checked = await authorized(params);
  if (checked.error) return checked.error;
  const { actor, values } = checked;
  const attempt = await getStudentLearningAssessmentAttempt(actor!.userId,
    values!.courseId, values!.assessmentId, values!.attemptId);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ attempt }, { headers: noStore });
}

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const checked = await authorized(params);
  if (checked.error) return checked.error;
  const input = learningAssessmentAnswers.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400, headers: noStore });
  const { actor, values } = checked;
  try {
    const result = await submitStudentLearningAssessment(actor!.userId, values!.courseId,
      values!.assessmentId, values!.attemptId, input.data.answers);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
    return NextResponse.json(result, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof LearningAssessmentUnavailable) {
      return NextResponse.json({ error: error.kind }, { status: 409, headers: noStore });
    }
    throw error;
  }
}
