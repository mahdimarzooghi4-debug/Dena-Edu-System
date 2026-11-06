import { NextRequest, NextResponse } from "next/server";
import { demoStudentWorkspace, isStudentDemoEnabled } from "../../../../server/student/demo-app";
import { decodeDemoState, DEMO_COOKIE, demoEvaluationQuestions } from "../../../../server/student/demo-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!isStudentDemoEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { assessments, ...publicData } = demoStudentWorkspace;
  const publicAssessments = assessments.map(({ id, title, courseId, question, choices }) =>
    ({ id, title, courseId, question, choices }));
  return NextResponse.json({
    mode: "synthetic", persisted: "signed-cookie-only", formal: false,
    ...publicData, assessments: publicAssessments, evaluationQuestions: demoEvaluationQuestions,
    state: decodeDemoState(request.cookies.get(DEMO_COOKIE)?.value),
  }, { headers: { "Cache-Control": "no-store, private", "X-Dena-Data-Mode": "synthetic" } });
}
