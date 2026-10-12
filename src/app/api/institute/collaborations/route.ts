import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteCollaborations } from "../../../../server/provider/collaborations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cache });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  return NextResponse.json({ collaborations: await getInstituteCollaborations(actor.userId) }, { headers: cache });
}
