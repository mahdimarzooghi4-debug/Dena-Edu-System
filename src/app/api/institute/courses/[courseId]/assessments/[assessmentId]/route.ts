import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../server/access/role-application-contracts";
import {
  decideInstituteLearningAssessment, getInstituteLearningAssessments,
  LearningAssessmentUnavailable, learningAssessmentDecision,
} from "../../../../../../../server/assessments/learning-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string; assessmentId: string }> };

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "institute")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const { courseId, assessmentId } = await params.params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(assessmentId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const scope = await getInstituteLearningAssessments(actor.userId, courseId);
  if (!scope) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const parsed = learningAssessmentDecision.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, {
    status: 400, headers: noStore,
  });
  try {
    const result = await decideInstituteLearningAssessment(
      actor.userId, courseId, assessmentId, parsed.data,
    );
    if (!result) return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) {
    if (!(error instanceof LearningAssessmentUnavailable)) throw error;
    return NextResponse.json({ error: error.kind }, {
      status: error.kind === "already_reviewed" ? 409 : 422,
      headers: noStore,
    });
  }
}
