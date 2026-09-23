import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { getInstituteCourseDetail } from "../../../../../../server/institute/course-detail";

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
  const ids = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "institute" ? [item.instituteId] : []))];
  if (!ids.length) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const course = await getInstituteCourseDetail(ids, courseId);
  if (!course) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ course }, { headers: noStore });
}
