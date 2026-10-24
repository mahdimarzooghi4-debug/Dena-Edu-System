import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  cancelInstituteServiceCall, endInstituteServiceCall,
  InstituteServiceCallError, startInstituteServiceCall,
} from "../../../../../server/institute/service-calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const inputSchema = z.object({ action: z.enum(["start", "end", "cancel"]) }).strict();

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
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: noStore });
  }
  try {
    const result = parsed.data.action === "start"
      ? await startInstituteServiceCall(actor.userId, callId)
      : parsed.data.action === "end"
        ? await endInstituteServiceCall(actor.userId, callId)
        : await cancelInstituteServiceCall(actor.userId, callId);
    return NextResponse.json({ call: result }, { headers: noStore });
  } catch (error) {
    if (!(error instanceof InstituteServiceCallError)) throw error;
    const status = error.kind === "media_shutdown_failed" ? 503
      : error.kind === "institute_unavailable" ? 403
      : error.kind === "call_unavailable" || error.kind === "order_unavailable" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
