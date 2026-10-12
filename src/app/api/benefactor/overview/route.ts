import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getBenefactorScopes } from "../../../../server/benefactor/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Read-only; no user or benefactor identifier is accepted from the client. */
export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "benefactor")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const benefactors = await getBenefactorScopes(actor.userId);
  if (!benefactors.length) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ benefactors }, { headers: noStore });
}
