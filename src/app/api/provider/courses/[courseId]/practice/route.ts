import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  createProviderPractice, getProviderPractice, newPracticeQuestion,
  PracticeUnavailable,
} from "../../../../../../server/student/course-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string }> };

async function scoped(params: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({
    error: "Unauthorized",
  }, { status: 401, headers: noStore }) };
  if (!actor.memberships.some((entry) => entry.role === "provider")) {
    return { error: NextResponse.json({
      error: "Forbidden",
    }, { status: 403, headers: noStore }) };
  }
  const { courseId } = await params.params;
  if (!z.uuid().safeParse(courseId).success) return { error: NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore }) };
  const state = await getProviderPractice(actor.userId, courseId);
  if (!state) return { error: NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore }) };
  return { actor, courseId, state };
}

export async function GET(_request: NextRequest, params: Params) {
  const checked = await scoped(params);
  if (checked.error) return checked.error;
  return NextResponse.json(checked.state, { headers: noStore });
}

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const checked = await scoped(params);
  if (checked.error) return checked.error;
  const parsed = newPracticeQuestion.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, {
    status: 400, headers: noStore,
  });
  try {
    const result = await createProviderPractice(
      checked.actor!.userId, checked.courseId!, parsed.data,
    );
    return NextResponse.json(result, { status: 201, headers: noStore });
  } catch (error) {
    if (!(error instanceof PracticeUnavailable)) throw error;
    return NextResponse.json({ error: error.kind }, {
      status: error.kind === "already_created" ? 409 : 404,
      headers: noStore,
    });
  }
}
