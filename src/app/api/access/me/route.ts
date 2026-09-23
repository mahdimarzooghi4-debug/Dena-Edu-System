import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: { "Cache-Control": "no-store" },
  });
  return NextResponse.json({
    // Only expose the caller's own server-verified scopes; never session token.
    userId: actor.userId, memberships: actor.memberships,
  }, { headers: { "Cache-Control": "no-store" } });
}
