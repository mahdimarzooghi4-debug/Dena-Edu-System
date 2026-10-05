import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import {
  createTechnicalSupportTicket, listRequesterTechnicalSupportTickets,
  newTechnicalSupportTicket,
} from "../../../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  const result = await listRequesterTechnicalSupportTickets(actor.userId, cursor);
  if (!result) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });
  if (result.invalidCursor) return NextResponse.json({ error: "Invalid cursor" }, {
    status: 400, headers: noStore,
  });
  return NextResponse.json(result, { headers: noStore });
}

export async function POST(request: NextRequest) {
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
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return NextResponse.json({ error: "Payload too large" }, {
    status: 413, headers: noStore,
  });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  const parsed = newTechnicalSupportTicket.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  const result = await createTechnicalSupportTicket(actor.userId, parsed.data);
  if (!result) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });
  return NextResponse.json(result, { status: 201, headers: noStore });
}
