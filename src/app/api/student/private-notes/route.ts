import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import {
  countStudentVideoNotes, deleteAllStudentVideoNotes,
} from "../../../../server/student/note-privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const deleteRequest = z.object({
  confirm: z.literal("DELETE_ALL_MY_VIDEO_NOTES"),
}).strict();

async function currentStudent() {
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({
    error: "Unauthorized",
  }, { status: 401, headers: noStore }) };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return { error: NextResponse.json({
      error: "Forbidden",
    }, { status: 403, headers: noStore }) };
  }
  return { userId: actor.userId };
}

/** Counts ALL of this user's retained notes, including currently inaccessible
 * videos. No note text, asset UUIDs, or third-party identity is returned.
 */
export async function GET() {
  const student = await currentStudent();
  if (student.error) return student.error;
  return NextResponse.json({
    noteCount: await countStudentVideoNotes(student.userId!),
  }, { headers: noStore });
}

/** Explicit, owner-only bulk deletion. Does not touch enrollments, media,
 * self-reported completion, or other learners' notes.
 */
export async function DELETE(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const student = await currentStudent();
  if (student.error) return student.error;
  const raw: unknown = await request.json().catch(() => null);
  if (!deleteRequest.safeParse(raw).success) {
    return NextResponse.json({ error: "Invalid confirmation" }, {
      status: 400, headers: noStore,
    });
  }
  const deleted = await deleteAllStudentVideoNotes(student.userId!);
  return NextResponse.json({
    deleted,
    noteCount: await countStudentVideoNotes(student.userId!),
  }, { headers: noStore });
}
