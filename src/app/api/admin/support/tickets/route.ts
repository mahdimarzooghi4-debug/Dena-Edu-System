import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { listTechnicalSupportInbox } from "../../../../../server/support/tickets";

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
  const result = await listTechnicalSupportInbox(actor.userId, cursor);
  if (!result) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });
  if (result.invalidCursor) return NextResponse.json({ error: "Invalid cursor" }, {
    status: 400, headers: noStore,
  });
  return NextResponse.json({ tickets: result.tickets, nextCursor: result.nextCursor }, {
    headers: noStore,
  });
}
