import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../../../db";
import { studentVideoCompletions } from "../../../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../server/access/role-application-contracts";
import { hasStudentEntitlement } from "../../../../../../../../server/student/entitlement";
import { isReadyVideoOfCourse } from "../../../../../../../../server/student/video-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
type Params = { params: Promise<{ courseId: string; assetId: string }> };

async function authorized(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    }) };
  }
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  }) };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    }) };
  }
  const { courseId, assetId } = await params.params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(assetId).success ||
      !await hasStudentEntitlement(actor.userId, courseId) ||
      !await isReadyVideoOfCourse(courseId, assetId)) {
    return { error: NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    }) };
  }
  return { actor, courseId, assetId };
}

/** Self-reported completion; not generated from video GET/Range requests. */
export async function POST(request: NextRequest, params: Params) {
  const checked = await authorized(request, params);
  if (checked.error) return checked.error;
  const body: unknown = await request.json().catch(() => null);
  if (!z.object({}).strict().safeParse(body).success) {
    return NextResponse.json({ error: "Invalid request" }, {
      status: 400, headers: noStore,
    });
  }
  const { actor, courseId, assetId } = checked;
  const [created] = await getDb().insert(studentVideoCompletions).values({
    studentUserId: actor!.userId, assetId: assetId!,
  }).onConflictDoNothing({
    target: [studentVideoCompletions.studentUserId,
      studentVideoCompletions.assetId],
  }).returning({ id: studentVideoCompletions.id });
  return NextResponse.json({ courseId, assetId, completed: true,
    replayed: !created }, {
    status: created ? 201 : 200, headers: noStore,
  });
}

/** Removing a personal marker never alters another student's state. */
export async function DELETE(request: NextRequest, params: Params) {
  const checked = await authorized(request, params);
  if (checked.error) return checked.error;
  const { actor, courseId, assetId } = checked;
  await getDb().delete(studentVideoCompletions).where(and(
    eq(studentVideoCompletions.studentUserId, actor!.userId),
    eq(studentVideoCompletions.assetId, assetId!),
  ));
  return NextResponse.json({ courseId, assetId, completed: false }, {
    headers: noStore,
  });
}
