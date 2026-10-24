import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  InstituteServiceCallError, publishInstituteServiceCallFollowUp,
} from "../../../../../../server/institute/service-calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { callId } = await params;
  if (!z.uuid().safeParse(callId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const body = await request.json().catch(() => null);
  try {
    const followUp = await publishInstituteServiceCallFollowUp(actor.userId, callId, body);
    return NextResponse.json({ followUp }, { headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid follow-up" }, { status: 400, headers: noStore });
    }
    if (!(error instanceof InstituteServiceCallError)) throw error;
    const status = error.kind === "institute_unavailable" ? 403
      : error.kind === "call_unavailable" || error.kind === "order_unavailable" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
