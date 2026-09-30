import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import { deactivateInstituteCourseTeamMember } from "@/server/institute/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = {
  params: Promise<{ courseId: string; teamMemberId: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }

  const actor = await getServerAccessContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401, headers: noStore,
    });
  }
  if (!actor.memberships.some((entry) => entry.role === "institute")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }

  const { courseId, teamMemberId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(teamMemberId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }

  const result = await deactivateInstituteCourseTeamMember(
    actor.userId, courseId, teamMemberId,
  );
  if (!result) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }

  return NextResponse.json(result, { headers: noStore });
}
