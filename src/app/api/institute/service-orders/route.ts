import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteServiceOrders } from "../../../../server/institute/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const result = await getInstituteServiceOrders(actor.userId);
  if (!result.institutes.length) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ orders: result.orders }, { headers: noStore });
}
