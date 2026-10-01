import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  confirmInstituteServiceOrderGuardianConsent, InstituteServiceOrderError,
} from "../../../../../../server/institute/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const inputSchema = z.object({ consentConfirmed: z.literal(true) }).strict();

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
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid confirmation" }, { status: 400, headers: noStore });
  }
  try {
    const order = await confirmInstituteServiceOrderGuardianConsent(actor.userId, orderId);
    return NextResponse.json({ order }, { headers: noStore });
  } catch (error) {
    if (!(error instanceof InstituteServiceOrderError)) throw error;
    const status = error.kind === "reviewer_unavailable" ? 403
      : error.kind === "order_unavailable" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
