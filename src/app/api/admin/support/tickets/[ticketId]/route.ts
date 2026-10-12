import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  updateTechnicalSupportTicket,
  updateTechnicalSupportTicketByOperator,
} from "../../../../../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ ticketId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { ticketId } = await params;
  if (!z.uuid().safeParse(ticketId).success) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return NextResponse.json({ error: "Payload too large" }, {
    status: 413, headers: noStore,
  });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  const parsed = updateTechnicalSupportTicket.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  const ticket = await updateTechnicalSupportTicketByOperator(actor.userId, ticketId, parsed.data);
  if (!ticket) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ ticket }, { headers: noStore });
}
