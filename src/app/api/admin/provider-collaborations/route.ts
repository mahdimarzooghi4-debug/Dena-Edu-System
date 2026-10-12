import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getDenaCollaborationQueue } from "../../../../server/provider/collaborations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cache });
  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  return NextResponse.json({ pending: await getDenaCollaborationQueue() }, { headers: cache });
}
