import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getAdminOverview } from "../../../../server/admin/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    return NextResponse.json({ error: "unauthorized" }, {
      status: 401, headers: noStore,
    });
  }

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

  return NextResponse.json(await getAdminOverview(), { headers: noStore });
}
