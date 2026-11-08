import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  getServiceOrderConversation, sendServiceOrderMessage, ServiceOrderMessageError,
} from "../../../../../server/student/service-order-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

async function participant(orderId: string) {
  if (!z.uuid().safeParse(orderId).success) return null;
  const actor = await getServerAccessContext();
  if (!actor || !actor.memberships.some((entry) => entry.role === "student" || entry.role === "institute")) return null;
  return actor;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const actor = await participant(orderId);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const conversation = await getServiceOrderConversation(actor.userId, orderId);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ conversation }, { headers: noStore });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { orderId } = await params;
  const actor = await participant(orderId);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const rawBody = await request.text();
  if (rawBody.length > 12_000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 413, headers: noStore });
  }
  const parsed = (() => { try { return JSON.parse(rawBody); } catch { return null; } })();
  try {
    const message = await sendServiceOrderMessage(actor.userId, orderId, parsed);
    return NextResponse.json({ message }, { status: message.duplicate ? 200 : 201, headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400, headers: noStore });
    }
    if (error instanceof ServiceOrderMessageError) {
      return NextResponse.json({ error: error.kind }, {
        status: error.kind === "rate_limited" ? 429 : error.kind === "idempotency_conflict" ? 409 : 404, headers: noStore,
      });
    }
    throw error;
  }
}
