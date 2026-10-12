import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import { changeExamStatus, examStatusInput, ExamManagementError } from "../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ examId: string }> };

export async function PATCH(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "admin")) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const { examId } = await params.params;
  if (!z.uuid().safeParse(examId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const parsed = examStatusInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400, headers: noStore });
  try {
    return NextResponse.json({ exam: await changeExamStatus(actor.userId, "admin", examId, parsed.data.status) }, { headers: noStore });
  } catch (error) {
    if (error instanceof ExamManagementError) return NextResponse.json({ error: error.kind }, { status: 409, headers: noStore });
    throw error;
  }
}
