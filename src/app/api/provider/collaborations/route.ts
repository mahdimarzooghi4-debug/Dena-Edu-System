import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import {
  createProviderCollaborationInput,
} from "../../../../server/provider/collaboration-contracts";
import {
  CollaborationWorkflowError, createProviderCollaboration, getProviderCollaborations,
} from "../../../../server/provider/collaborations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cache });
  if (!actor.memberships.some((item) => item.role === "provider")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  return NextResponse.json(await getProviderCollaborations(actor.userId), { headers: cache });
}

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cache });
  if (!actor.memberships.some((item) => item.role === "provider")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const parsed = createProviderCollaborationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: cache });
  try {
    const result = await createProviderCollaboration(actor.userId, parsed.data);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201, headers: cache });
  } catch (error) {
    if (!(error instanceof CollaborationWorkflowError)) throw error;
    const status = error.kind === "provider_unavailable" ? 403
      : error.kind === "institute_unavailable" || error.kind === "not_found" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: cache });
  }
}
