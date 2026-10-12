import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { collaborationDecisionInput } from "../../../../../../server/provider/collaboration-contracts";
import {
  CollaborationWorkflowError, decideInstituteCollaboration,
} from "../../../../../../server/provider/collaborations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest,
  { params }: { params: Promise<{ collaborationId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cache });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const { collaborationId } = await params;
  if (!z.uuid().safeParse(collaborationId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: cache });
  }
  const parsed = collaborationDecisionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, { status: 400, headers: cache });
  try {
    return NextResponse.json(await decideInstituteCollaboration(actor.userId, collaborationId, parsed.data), { headers: cache });
  } catch (error) {
    if (!(error instanceof CollaborationWorkflowError)) throw error;
    const status = error.kind === "not_found" ? 404
      : error.kind === "reviewer_unavailable" || error.kind === "conflicted_reviewer" ? 403 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: cache });
  }
}
