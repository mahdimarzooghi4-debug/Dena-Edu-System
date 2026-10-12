import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getOrganizationScopes } from "../../../../server/organization/scopes";
import { createOrganizationApiKey, listOrganizationApiKeys } from "../../../../server/organization/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const base = process.env.BETTER_AUTH_URL;
  return Boolean(origin && base && origin === new URL(base).origin);
}

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((membership) => membership.role === "organization")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const scopes = await getOrganizationScopes(actor.userId);
  const all = await Promise.all(scopes.map((scope) => listOrganizationApiKeys(actor.userId, scope.id)));
  return NextResponse.json({ keys: all.flat() }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({
    organizationId: z.string().uuid(), label: z.string().trim().min(1).max(80),
    rotateFromKeyId: z.string().uuid().optional(),
  }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid API key request" }, { status: 400, headers: noStore });
  const created = await createOrganizationApiKey({ actorUserId: actor.userId, ...parsed.data });
  if (!created) return NextResponse.json({ error: "Organization scope or key unavailable" }, { status: 404, headers: noStore });
  return NextResponse.json({ key: created }, { status: 201, headers: noStore });
}
