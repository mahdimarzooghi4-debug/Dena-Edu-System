import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../server/access/role-application-contracts";
import { cancelStudentServiceOrder, StudentServiceOrderError } from "../../../../../../../server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ orderId: string }> };

export async function POST(request: NextRequest, context: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "student")) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const { orderId } = await context.params;
  if (!z.uuid().safeParse(orderId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  try {
    const order = await cancelStudentServiceOrder(actor.userId, orderId);
    return NextResponse.json({ order }, { headers: noStore });
  } catch (error) {
    if (error instanceof StudentServiceOrderError) return NextResponse.json({ error: error.kind }, {
      status: error.kind === "student_unavailable" || error.kind === "order_unavailable" ? 404 : 409,
      headers: noStore,
    });
    throw error;
  }
}
