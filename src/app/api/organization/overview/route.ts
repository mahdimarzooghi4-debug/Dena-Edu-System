import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getOrganizationScopes } from "../../../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Read-only. User and allowed organization scopes always come from DB-backed
 * server session; no organization ID is accepted from query or client claims.
 */
export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "organization")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const organizations = await getOrganizationScopes(actor.userId);
  if (!organizations.length) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ organizations }, { headers: noStore });
}
