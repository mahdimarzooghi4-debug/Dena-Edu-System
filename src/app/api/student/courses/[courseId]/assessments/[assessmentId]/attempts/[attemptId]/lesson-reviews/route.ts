import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../../../server/access/role-application-contracts";
import { acknowledgeStudentLearningAssessmentLessonReview, learningAssessmentLessonReview } from "../../../../../../../../../../server/assessments/learning-assessment";
import { hasStudentEntitlement } from "../../../../../../../../../../server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string; assessmentId: string; attemptId: string }> };

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { courseId, assessmentId, attemptId } = await params.params;
  if (![courseId, assessmentId, attemptId].every((id) => z.uuid().safeParse(id).success) ||
      !await hasStudentEntitlement(actor.userId, courseId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const input = learningAssessmentLessonReview.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  const result = await acknowledgeStudentLearningAssessmentLessonReview(actor.userId,
    courseId, assessmentId, attemptId, input.data.lessonAssetId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json(result, { status: 201, headers: noStore });
}
