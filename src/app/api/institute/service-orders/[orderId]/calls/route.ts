import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  InstituteServiceCallError, scheduleInstituteServiceCall,
} from "../../../../../../server/institute/service-calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const body = await request.json().catch(() => null);
  try {
    const call = await scheduleInstituteServiceCall(actor.userId, orderId, body);
    return NextResponse.json({ call }, { status: call.duplicate ? 200 : 201, headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400, headers: noStore });
    }
    if (!(error instanceof InstituteServiceCallError)) throw error;
    const status = error.kind === "institute_unavailable" ? 403
      : error.kind === "order_unavailable" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
