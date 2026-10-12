import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import {
  createDenaQuestion, denaQuestionInput, DenaQuestionBankError,
  getDenaQuestionBank,
} from "../../../../server/admin/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const state = await getDenaQuestionBank(actor.userId);
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
  const parsed = denaQuestionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400, headers: noStore });
  try {
    const question = await createDenaQuestion(actor.userId, parsed.data);
    return NextResponse.json({ question }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof DenaQuestionBankError) {
      return NextResponse.json({ error: error.kind }, { status: 404, headers: noStore });
    }
    throw error;
  }
}
