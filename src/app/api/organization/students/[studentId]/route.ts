import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { deleteOrganizationStudent } from "../../../../../server/organization/students";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function DELETE(request: NextRequest, context: { params: Promise<{ studentId: string }> }) {
  const origin = request.headers.get("origin");
  const base = process.env.BETTER_AUTH_URL;
  if (!origin || !base || origin !== new URL(base).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const { studentId } = await context.params;
  if (!z.string().uuid().safeParse(studentId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!z.object({ confirm: z.literal("DELETE_ORGANIZATION_STUDENT") }).strict().safeParse(body).success) {
    return NextResponse.json({ error: "Explicit confirmation required" }, { status: 400, headers: noStore });
  }
  const deleted = await deleteOrganizationStudent(actor.userId, studentId);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ deleted: true }, { headers: noStore });
}
