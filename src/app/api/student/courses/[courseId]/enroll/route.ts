import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  enrollFreeCourse, StudentEnrollmentError,
} from "../../../../../../server/student/enroll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

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
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const body: unknown = await request.json().catch(() => null);
  if (!z.object({}).strict().safeParse(body).success) return NextResponse.json({
    error: "Invalid request",
  }, { status: 400, headers: noStore });
  try {
    const result = await enrollFreeCourse(actor.userId, courseId);
    return NextResponse.json({ ...result, free: true }, {
      status: result.replayed ? 200 : 201, headers: noStore,
    });
  } catch (err) {
    if (!(err instanceof StudentEnrollmentError)) throw err;
    return NextResponse.json({ error: err.kind }, {
      status: err.kind === "not_student" ? 403 :
        err.kind === "enrollment_cancelled" ? 409 : 404,
      headers: noStore,
    });
  }
}
