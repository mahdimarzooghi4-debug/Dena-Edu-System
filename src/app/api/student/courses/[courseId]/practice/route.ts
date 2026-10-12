import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { hasStudentEntitlement } from "../../../../../../server/student/entitlement";
import {
  getStudentPractice, practiceAnswer, submitStudentPractice,
} from "../../../../../../server/student/course-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string }> };

async function scoped(params: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  }) };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    }) };
  }
  const { courseId } = await params.params;
  if (!z.uuid().safeParse(courseId).success ||
      !await hasStudentEntitlement(actor.userId, courseId)) {
    return { error: NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    }) };
  }
  return { userId: actor.userId, courseId };
}

/** No correctOption, answer key or other student attempts in this payload. */
export async function GET(_request: NextRequest, params: Params) {
  const checked = await scoped(params);
  if (checked.error) return checked.error;
  const practice = await getStudentPractice(checked.userId!, checked.courseId!);
  return NextResponse.json({ practice }, { headers: noStore });
}

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const checked = await scoped(params);
  if (checked.error) return checked.error;
  const parsed = practiceAnswer.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid answer" }, {
    status: 400, headers: noStore,
  });
  const result = await submitStudentPractice(
    checked.userId!, checked.courseId!, parsed.data.selectedOption,
  );
  if (!result) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json(result, {
    status: result.replayed ? 200 : 201,
    headers: noStore,
  });
}
