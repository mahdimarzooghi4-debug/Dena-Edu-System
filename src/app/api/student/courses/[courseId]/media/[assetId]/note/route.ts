import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../../../db";
import { studentVideoNotes } from "../../../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../server/access/role-application-contracts";
import { hasStudentEntitlement } from "../../../../../../../../server/student/entitlement";
import { isReadyVideoOfCourse } from "../../../../../../../../server/student/video-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateNoStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string; assetId: string }> };
const noteInput = z.object({
  note: z.string().min(1).max(2000).refine((value) =>
    value.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
  ),
}).strict();

async function authorized(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: privateNoStore,
    }) };
  }
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: privateNoStore,
  }) };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: privateNoStore,
    }) };
  }
  const { courseId, assetId } = await params.params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(assetId).success ||
      !await hasStudentEntitlement(actor.userId, courseId) ||
      !await isReadyVideoOfCourse(courseId, assetId)) {
    return { error: NextResponse.json({ error: "Not found" }, {
      status: 404, headers: privateNoStore,
    }) };
  }
  return { studentUserId: actor.userId, courseId, assetId };
}

/** Save a private note without touching a completion marker. */
export async function PUT(request: NextRequest, params: Params) {
  const checked = await authorized(request, params);
  if (checked.error) return checked.error;
  const raw: unknown = await request.json().catch(() => null);
  const parsed = noteInput.safeParse(raw);
  if (!parsed.success) return NextResponse.json({
    error: "Invalid note",
  }, { status: 400, headers: privateNoStore });
  const note = parsed.data.note.trim();
  const { studentUserId, courseId, assetId } = checked;
  await getDb().insert(studentVideoNotes).values({
    studentUserId: studentUserId!, assetId: assetId!, body: note,
  }).onConflictDoUpdate({
    target: [studentVideoNotes.studentUserId, studentVideoNotes.assetId],
    set: { body: note, updatedAt: new Date() },
  });
  return NextResponse.json({
    courseId, assetId, note,
  }, { headers: privateNoStore });
}

/** Idempotent owner-only deletion. Does NOT unmark the video. */
export async function DELETE(request: NextRequest, params: Params) {
  const checked = await authorized(request, params);
  if (checked.error) return checked.error;
  const { studentUserId, courseId, assetId } = checked;
  await getDb().delete(studentVideoNotes).where(and(
    eq(studentVideoNotes.studentUserId, studentUserId!),
    eq(studentVideoNotes.assetId, assetId!),
  ));
  return NextResponse.json({ courseId, assetId, note: null }, {
    headers: privateNoStore,
  });
}
