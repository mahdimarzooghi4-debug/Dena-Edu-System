import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import { markTechnicalSupportNotificationRead } from "../../../../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ notificationId: string }> };

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
  const { notificationId } = await params;
  if (!z.uuid().safeParse(notificationId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const marked = await markTechnicalSupportNotificationRead(actor.userId, notificationId);
  if (!marked) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ marked: true }, { headers: noStore });
}
