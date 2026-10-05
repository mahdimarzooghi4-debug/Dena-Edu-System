import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { ExamManagementError, startStudentExam } from "../../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ examId: string }> };

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { examId } = await params.params;
  if (!z.uuid().safeParse(examId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  try {
    return NextResponse.json(await startStudentExam(actor.userId, examId), {
      status: 201, headers: noStore,
    });
  } catch (error) {
    if (error instanceof ExamManagementError) {
      const status = error.kind === "student_unavailable" ? 404 : 409;
      return NextResponse.json({ error: error.kind }, { status, headers: noStore });
    }
    throw error;
  }
}
