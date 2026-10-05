import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import { createDenaExam, denaExamInput, ExamManagementError, getDenaExams } from "../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const state = await getDenaExams(actor.userId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json(state, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const parsed = denaExamInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid exam" }, { status: 400, headers: noStore });
  try {
    const exam = await createDenaExam(actor.userId, parsed.data);
    return NextResponse.json({ exam }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ExamManagementError) {
      return NextResponse.json({ error: error.kind }, { status: 422, headers: noStore });
    }
    throw error;
  }
}
