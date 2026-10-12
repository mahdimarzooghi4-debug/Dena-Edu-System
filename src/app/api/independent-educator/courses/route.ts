import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import { newIndependentEducatorCourse } from "@/server/independent-educators/course-contracts";
import {
  createIndependentEducatorCourse, getIndependentEducatorCourses,
  IndependentEducatorCourseError,
} from "@/server/independent-educators/course-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((membership) => membership.role === "student")) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const courses = await getIndependentEducatorCourses(actor.userId);
  return NextResponse.json({ courses }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((membership) => membership.role === "student")) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const parsed = newIndependentEducatorCourse.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  try {
    const result = await createIndependentEducatorCourse(actor.userId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201, headers: noStore,
    });
  } catch (error) {
    if (!(error instanceof IndependentEducatorCourseError)) throw error;
    const status = error.kind === "profile_unavailable" ? 403
      : error.kind === "affiliation_unavailable" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
