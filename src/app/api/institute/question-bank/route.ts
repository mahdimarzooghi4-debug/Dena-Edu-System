import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import {
  createInstituteQuestion, getInstituteQuestionBank,
  InstituteQuestionBankError, instituteQuestionInput,
} from "../../../../server/institute/question-bank";
import { getInstituteScopes } from "../../../../server/institute/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const scopes = await getInstituteScopes(actor.userId);
  if (!scopes.length) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const result = await getInstituteQuestionBank(actor.userId, search);
  return NextResponse.json(result, { headers: noStore });
}

export async function POST(request: NextRequest) {
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
  const parsed = instituteQuestionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, {
    status: 400, headers: noStore,
  });
  try {
    const question = await createInstituteQuestion(actor.userId, parsed.data);
    return NextResponse.json({ question }, { status: 201, headers: noStore });
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
