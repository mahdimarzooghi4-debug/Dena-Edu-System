import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { revokeOrganizationApiKey } from "../../../../../server/organization/api-keys";
import { getOrganizationScopes } from "../../../../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function DELETE(request: NextRequest, context: { params: Promise<{ keyId: string }> }) {
  const origin = request.headers.get("origin");
  const base = process.env.BETTER_AUTH_URL;
  if (!origin || !base || origin !== new URL(base).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { keyId } = await context.params;
  if (!z.string().uuid().safeParse(keyId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const scopes = await getOrganizationScopes(actor.userId);
  for (const scope of scopes) {
    const revoked = await revokeOrganizationApiKey({ actorUserId: actor.userId, organizationId: scope.id, keyId });
    if (revoked) return NextResponse.json({ revoked: true }, { headers: noStore });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
}
