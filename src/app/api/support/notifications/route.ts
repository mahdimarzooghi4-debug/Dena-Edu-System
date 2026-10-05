import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { listTechnicalSupportNotifications } from "../../../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const notifications = await listTechnicalSupportNotifications(actor.userId);
  if (!notifications) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });
  return NextResponse.json({ notifications }, { headers: noStore });
}
