import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getOrganizationScopes } from "../../../../../server/organization/scopes";
import { createOrganizationStudent, OrganizationStudentError } from "../../../../../server/organization/students";
import { parseStudentImport } from "../../../../../server/organization/import-file";
import { studentInputSchema } from "../../../../../server/organization/student-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const base = process.env.BETTER_AUTH_URL;
  if (!origin || !base || origin !== new URL(base).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 413, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const scopes = await getOrganizationScopes(actor.userId);
  if (!scopes.length) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const organizationId = form?.get("organizationId");
  const guardianConsentConfirmed = form?.get("guardianConsentConfirmed");
  if (!(file instanceof File) || typeof organizationId !== "string" ||
      !scopes.some((scope) => scope.id === organizationId) || guardianConsentConfirmed !== "true") {
    return NextResponse.json({ error: "Invalid import request" }, { status: 400, headers: noStore });
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 413, headers: noStore });
    const rows = parseStudentImport(bytes, file.name);
    const parsed = rows.map((row) => ({ rowNumber: row.rowNumber, result: studentInputSchema.safeParse(row.values) }));
    const errors = parsed.filter((row) => !row.result.success).map((row) => ({ row: row.rowNumber, error: "invalid_row" }));
    const valid = parsed.filter((row) => row.result.success).map((row) => ({
      rowNumber: row.rowNumber,
      record: row.result.success ? row.result.data : null,
    })).filter((row): row is { rowNumber: number; record: NonNullable<typeof row.record> } => Boolean(row.record));
    const nationalCodes = new Set<string>();
    const phones = new Set<string>();
    for (const row of valid) {
      if (nationalCodes.has(row.record.nationalCode) || phones.has(row.record.phoneNumber)) {
        errors.push({ row: row.rowNumber, error: "duplicate_in_file" });
      }
      nationalCodes.add(row.record.nationalCode);
      phones.add(row.record.phoneNumber);
    }
    if (errors.length) return NextResponse.json({ imported: 0, errors }, { status: 400, headers: noStore });

    let imported = 0;
    for (const row of valid) {
      try {
        await createOrganizationStudent({
          actorUserId: actor.userId, organizationId, record: row.record, source: "bulk",
          guardianConsentConfirmed: true,
        });
        imported += 1;
      } catch (error) {
        if (error instanceof OrganizationStudentError) {
          errors.push({ row: row.rowNumber, error: error.kind === "duplicate" ? "already_exists" : "scope_unavailable" });
        } else {
          return NextResponse.json({ imported, errors: [...errors, { row: row.rowNumber, error: "import_stopped" }] }, { status: 500, headers: noStore });
        }
      }
    }
    return NextResponse.json({ imported, errors }, { status: errors.length ? 207 : 201, headers: noStore });
  } catch (error) {
    const kind = error instanceof Error ? error.message : "invalid_file";
    return NextResponse.json({ error: kind }, { status: 400, headers: noStore });
  }
}
