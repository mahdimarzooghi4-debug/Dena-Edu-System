import { NextResponse } from "next/server";
import { demoStudentWorkspace, isStudentDemoEnabled } from "../../../../server/student/demo-app";

export const dynamic = "force-dynamic";

export function GET() {
  if (!isStudentDemoEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { assessments, ...publicData } = demoStudentWorkspace;
  const publicAssessments = assessments.map(({ id, title, courseId, question, choices }) =>
    ({ id, title, courseId, question, choices }));
  return NextResponse.json({ mode: "synthetic", persisted: false, ...publicData, assessments: publicAssessments }, {
    headers: { "Cache-Control": "no-store, private", "X-Dena-Data-Mode": "synthetic" },
  });
}
