import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { supervisionDecision } from "../../../../../../server/courses/contracts";
import {
  CourseWorkflowError, decideCourseSupervision,
} from "../../../../../../server/courses/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((membership) => membership.role === "institute")) {
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
  const parsed = supervisionDecision.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, {
    status: 400, headers: noStore,
  });
  try {
    const result = await decideCourseSupervision(actor.userId, courseId, parsed.data);
    return NextResponse.json(result, { headers: noStore });
  } catch (err) {
    if (!(err instanceof CourseWorkflowError)) throw err;
    const status = err.kind === "course_not_found" ? 404 :
      err.kind === "conflicted_reviewer" || err.kind === "institute_not_active"
        ? 403 : 409;
    return NextResponse.json({ error: err.kind }, { status, headers: noStore });
  }
}
