import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  createServiceOrderInput, createStudentServiceOrder, StudentServiceOrderError,
} from "../../../../../../server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ serviceId: string }> };

export async function POST(request: NextRequest, context: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "student")) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const { serviceId } = await context.params;
  const parsed = createServiceOrderInput.safeParse({
    serviceId,
    idempotencyKey: (await request.json().catch(() => null))?.idempotencyKey,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400, headers: noStore });
  try {
    const order = await createStudentServiceOrder(actor.userId, parsed.data);
    return NextResponse.json({ order }, { status: order.duplicate ? 200 : 201, headers: noStore });
  } catch (error) {
    if (error instanceof StudentServiceOrderError) {
      const status = error.kind === "student_unavailable" || error.kind === "service_unavailable" ? 404 : 409;
      return NextResponse.json({ error: error.kind }, { status, headers: noStore });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid order" }, { status: 400, headers: noStore });
    throw error;
  }
}
