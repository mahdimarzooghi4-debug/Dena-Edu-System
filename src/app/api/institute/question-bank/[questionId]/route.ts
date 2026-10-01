import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  InstituteQuestionBankError, instituteQuestionInput,
  updateInstituteQuestion,
} from "../../../../../server/institute/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ questionId: string }> };

export async function PATCH(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { questionId } = await params.params;
  if (!z.uuid().safeParse(questionId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const parsed = instituteQuestionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, {
    status: 400, headers: noStore,
  });
  try {
    const question = await updateInstituteQuestion(actor.userId, questionId, parsed.data);
    return NextResponse.json({ question }, { headers: noStore });
  } catch (error) {
    if (error instanceof InstituteQuestionBankError) {
      return NextResponse.json({ error: error.kind }, {
        status: error.kind === "scope_unavailable" ? 404 : 422,
        headers: noStore,
      });
    }
    throw error;
  }
}
