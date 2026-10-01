import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../server/access/role-application-contracts";
import {
  ExamManagementError, saveStudentExamAnswers, studentExamAnswersInput,
} from "../../../../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ examId: string; attemptId: string }> };

export async function PATCH(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const ids = z.object({ examId: z.uuid(), attemptId: z.uuid() }).safeParse(await params.params);
  if (!ids.success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const parsed = studentExamAnswersInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400, headers: noStore });
  try {
    return NextResponse.json(await saveStudentExamAnswers(
      actor.userId, ids.data.examId, ids.data.attemptId, parsed.data.answers,
    ), { headers: noStore });
  } catch (error) {
    if (error instanceof ExamManagementError) {
      return NextResponse.json({ error: error.kind }, {
        status: error.kind === "attempt_unavailable" ? 404 : 409, headers: noStore,
      });
    }
    throw error;
  }
}
