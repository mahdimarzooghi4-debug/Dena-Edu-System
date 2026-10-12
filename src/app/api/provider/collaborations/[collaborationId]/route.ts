import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  CollaborationWorkflowError, withdrawProviderCollaboration,
} from "../../../../../server/provider/collaborations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "private, no-store, max-age=0" };

export async function DELETE(request: NextRequest,
  { params }: { params: Promise<{ collaborationId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cache });
  if (!actor.memberships.some((item) => item.role === "provider")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const { collaborationId } = await params;
  if (!z.uuid().safeParse(collaborationId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: cache });
  }
  try {
    return NextResponse.json(
      await withdrawProviderCollaboration(actor.userId, collaborationId), { headers: cache },
    );
  } catch (error) {
    if (!(error instanceof CollaborationWorkflowError)) throw error;
    const status = error.kind === "not_found" ? 404
      : error.kind === "reviewer_unavailable" ? 403 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: cache });
  }
}
