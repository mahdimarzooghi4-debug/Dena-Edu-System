import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
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

  return NextResponse.json({
    error: "audit_log_not_enabled",
    message: "Audit log storage is not enabled until its reviewed migration is registered.",
  }, { status: 503, headers: noStore });
}
