import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../server/access/role-application-contracts";
import {
  ExamManagementError, getStudentExamAttempt, submitStudentExamAttempt,
} from "../../../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ examId: string; attemptId: string }> };

async function getParams(params: Params) {
  const values = await params.params;
  return z.object({ examId: z.uuid(), attemptId: z.uuid() }).safeParse(values);
}

export async function GET(_request: NextRequest, params: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const ids = await getParams(params);
  if (!ids.success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  try {
    const attempt = await getStudentExamAttempt(actor.userId, ids.data.examId, ids.data.attemptId);
    return NextResponse.json(attempt, { headers: noStore });
  } catch (error) {
    if (error instanceof ExamManagementError) {
      return NextResponse.json({ error: error.kind }, { status: 404, headers: noStore });
    }
    throw error;
  }
}

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const ids = await getParams(params);
  if (!ids.success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  try {
    const result = await submitStudentExamAttempt(actor.userId, ids.data.examId, ids.data.attemptId);
    return NextResponse.json(result, { headers: noStore });
  } catch (error) {
    if (error instanceof ExamManagementError) {
      return NextResponse.json({ error: error.kind }, { status: 409, headers: noStore });
    }
    throw error;
  }
}
