import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getRecentAuditLogs } from "../../../../server/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const actor = await getServerAccessContext();

  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, {
      status: 401, headers: noStore,
    });
  }

  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "forbidden" }, {
      status: 403, headers: noStore,
    });
  }

  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  const result = await getRecentAuditLogs(cursor);
  if (result.invalidCursor) return NextResponse.json({ error: "Invalid cursor" }, {
    status: 400, headers: noStore,
  });
  return NextResponse.json({ events: result.events, nextCursor: result.nextCursor }, {
    headers: noStore,
  });
}
