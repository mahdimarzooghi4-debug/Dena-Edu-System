import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../db";
import { studentEnrollments } from "../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Explicit owner-initiated cancellation. Cancelling preserves the audit row
 * and does not re-enable free access via a repeated enrollment request.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({
    error: "Forbidden",
  }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const body: unknown = await request.json().catch(() => null);
  if (!z.object({}).strict().safeParse(body).success) return NextResponse.json({
    error: "Invalid request",
  }, { status: 400, headers: noStore });
  const [cancelled] = await getDb().update(studentEnrollments).set({
    status: "cancelled", cancelledAt: new Date(),
  }).where(and(
    eq(studentEnrollments.courseId, courseId),
    eq(studentEnrollments.studentUserId, actor.userId),
    eq(studentEnrollments.status, "active"),
  )).returning({ id: studentEnrollments.id });
  return cancelled
    ? NextResponse.json({ courseId, cancelled: true }, { headers: noStore })
    : NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
}
