import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getAdminOverview } from "../../../../server/admin/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getServerAccessContext();

  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(await getAdminOverview());
}
