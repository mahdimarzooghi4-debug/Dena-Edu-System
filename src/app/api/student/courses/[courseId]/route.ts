import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getStudentCourseDetail } from "../../../../../server/student/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((item) => item.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const detail = await getStudentCourseDetail(actor.userId, courseId);
  if (!detail) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({
    ...detail,
    free: true,
  }, { headers: noStore });
}
