import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { getInstituteLearningAssessments } from "../../../../../../server/assessments/learning-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string }> };

async function scoped(params: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  }) };
  if (!actor.memberships.some((entry) => entry.role === "institute")) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    }) };
  }
  const { courseId } = await params.params;
  if (!z.uuid().safeParse(courseId).success) return {
    error: NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    }),
  };
  const state = await getInstituteLearningAssessments(actor.userId, courseId);
  if (!state) return { error: NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  }) };
  return { actor, courseId, state };
}

export async function GET(_request: NextRequest, params: Params) {
  const checked = await scoped(params);
  if (checked.error) return checked.error;
  return NextResponse.json(checked.state, { headers: noStore });
}
