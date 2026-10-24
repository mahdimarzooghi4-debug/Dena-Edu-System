import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getOrganizationScopes } from "../../../../server/organization/scopes";
import {
  OrganizationStudentError, createOrganizationStudent, listOrganizationStudents,
} from "../../../../server/organization/students";
import { studentInputSchema } from "../../../../server/organization/student-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const base = process.env.BETTER_AUTH_URL;
  return Boolean(origin && base && origin === new URL(base).origin);
}

export async function GET(request: NextRequest) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((membership) => membership.role === "organization")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const scopes = await getOrganizationScopes(actor.userId);
  const params = request.nextUrl.searchParams;
  const requestedOrganizationId = params.get("organizationId");
  const visibleScopes = requestedOrganizationId
    ? scopes.filter((scope) => scope.id === requestedOrganizationId)
    : scopes;
  if (requestedOrganizationId && !visibleScopes.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400, headers: noStore });
  }
  try {
    const page = await listOrganizationStudents(visibleScopes.map((scope) => scope.id), {
      activationPendingOnly: params.get("activation") === "pending",
      cursor: params.get("cursor") ?? undefined,
      limit,
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({ ...page, pageSize: limit }, { headers: noStore });
  } catch (error) {
    if (error instanceof OrganizationStudentError && error.kind === "invalid_cursor") {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400, headers: noStore });
    }
    if (error instanceof OrganizationStudentError && error.kind === "invalid_search") {
      return NextResponse.json({ error: "Invalid search" }, { status: 400, headers: noStore });
    }
    return NextResponse.json({ error: "Unable to list students" }, { status: 500, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((membership) => membership.role === "organization")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ organizationId: z.string().uuid(), student: studentInputSchema, guardianConsentConfirmed: z.literal(true) }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid student record" }, { status: 400, headers: noStore });
  try {
    const student = await createOrganizationStudent({
      actorUserId: actor.userId,
      organizationId: parsed.data.organizationId,
      record: parsed.data.student,
      source: "manual",
      guardianConsentConfirmed: true,
    });
    return NextResponse.json({ student }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof OrganizationStudentError) {
      const status = error.kind === "scope_unavailable" ? 404 : error.kind === "duplicate" ? 409 : 409;
      return NextResponse.json({ error: error.kind }, { status, headers: noStore });
    }
    return NextResponse.json({ error: "Unable to create student" }, { status: 500, headers: noStore });
  }
}
