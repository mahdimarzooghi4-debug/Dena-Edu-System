import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import {
  assignInstituteCourseTeamMember,
  courseTeamAssignmentInput,
  getInstituteCourseTeam,
} from "@/server/institute/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ courseId: string }> };

async function scoped({ params }: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return {
    error: NextResponse.json({ error: "Unauthorized" }, {
      status: 401, headers: noStore,
    }),
  };
  if (!actor.memberships.some((entry) => entry.role === "institute")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, {
        status: 403, headers: noStore,
      }),
    };
  }
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) {
    return {
      error: NextResponse.json({ error: "Not found" }, {
        status: 404, headers: noStore,
      }),
    };
  }
  return { actor, courseId };
}

export async function GET(_request: NextRequest, params: Params) {
  const checked = await scoped(params);
  if (checked.error) return checked.error;

  const team = await getInstituteCourseTeam(
    checked.actor!.userId, checked.courseId!,
  );
  if (!team) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  return NextResponse.json({ team }, { headers: noStore });
}

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }

  const checked = await scoped(params);
  if (checked.error) return checked.error;

  const parsed = courseTeamAssignmentInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assignment" }, {
      status: 400, headers: noStore,
    });
  }

  const result = await assignInstituteCourseTeamMember(
    checked.actor!.userId, checked.courseId!, parsed.data,
  );
  if (!result) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }

  return NextResponse.json(result, {
    status: result.replayed ? 200 : 201,
    headers: noStore,
  });
}
