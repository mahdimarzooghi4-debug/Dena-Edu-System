import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { hasStudentEntitlement } from "../../../../../../server/student/entitlement";
import { getStudentLearningAssessments } from "../../../../../../server/assessments/learning-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string }> };

export async function GET(_request: NextRequest, params: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { courseId } = await params.params;
  if (!z.uuid().safeParse(courseId).success ||
      !await hasStudentEntitlement(actor.userId, courseId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  return NextResponse.json(await getStudentLearningAssessments(actor.userId, courseId), {
    headers: noStore,
  });
}
