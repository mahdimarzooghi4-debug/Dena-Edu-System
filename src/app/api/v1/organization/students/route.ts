import { NextResponse, type NextRequest } from "next/server";
import { apiStudentInputSchema } from "../../../../../server/organization/student-contracts";
import { createOrganizationStudent, OrganizationStudentError } from "../../../../../server/organization/students";
import { authenticateOrganizationApiKey, reserveOrganizationApiKeyRequest } from "../../../../../server/organization/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer (dena_org_[A-Za-z0-9_-]{40,60})$/.exec(authorization);
  if (!match) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const key = await authenticateOrganizationApiKey(match[1]);
  if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!await reserveOrganizationApiKeyRequest(key.keyId)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: noStore });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_768) return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: noStore });
  const raw = await request.text();
  if (raw.length > 32_768) return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: noStore });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: noStore }); }
  const parsed = apiStudentInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid student record" }, { status: 400, headers: noStore });
  const { guardianConsentConfirmed, ...record } = parsed.data;
  try {
    const student = await createOrganizationStudent({
      actorUserId: key.createdByUserId,
      organizationId: key.organizationId,
      record,
      source: "api",
      guardianConsentConfirmed,
      apiKeyId: key.keyId,
    });
    return NextResponse.json({ student }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof OrganizationStudentError) {
      const status = error.kind === "scope_unavailable" ? 401 : 409;
      return NextResponse.json({ error: error.kind }, { status, headers: noStore });
    }
    return NextResponse.json({ error: "Unable to create student" }, { status: 500, headers: noStore });
  }
}
