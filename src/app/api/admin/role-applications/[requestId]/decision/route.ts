import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import {
  roleApplicationDecision, validSameOrigin,
} from "../../../../../../server/access/role-application-contracts";
import {
  ReviewRoleError, reviewRoleApplication,
} from "../../../../../../server/access/review-role-application";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: cache,
  });
  if (!actor.memberships.some((member) => member.role === "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const { requestId } = await params;
  if (!z.uuid().safeParse(requestId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: cache });
  const parsed = roleApplicationDecision.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, {
    status: 400, headers: cache,
  });
  try {
    const result = await reviewRoleApplication(actor.userId, requestId, parsed.data);
    return NextResponse.json(result, { headers: cache });
  } catch (error) {
    if (!(error instanceof ReviewRoleError)) throw error;
    const status = error.kind === "not_found" ? 404 :
      error.kind === "reviewer_revoked" || error.kind === "self_review" ? 403 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: cache });
  }
}
