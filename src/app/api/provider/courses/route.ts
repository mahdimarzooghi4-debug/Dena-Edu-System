import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "../../../../db";
import { courses, supervisionGrants } from "../../../../db/schema";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import { newSupervisedCourse } from "../../../../server/courses/contracts";
import {
  createSupervisedCourse, CourseWorkflowError,
} from "../../../../server/courses/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const ownScopes = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "provider" ? [membership.providerId] : []))];
  if (!ownScopes.length) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });

  const rows = await getDb().select({
    courseId: courses.id,
    title: courses.title,
    providerId: courses.providerId,
    responsibleInstituteId: courses.responsibleInstituteId,
    supervisionStatus: supervisionGrants.status,
  }).from(courses).innerJoin(
    supervisionGrants, eq(supervisionGrants.courseId, courses.id),
  ).where(inArray(courses.providerId, ownScopes))
    .orderBy(asc(supervisionGrants.status), asc(courses.title)).limit(50);
  // No approval evidence, PII, student identities or unsigned stream URLs.
  return NextResponse.json({ courses: rows }, { headers: noStore });
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

  const parsed = newSupervisedCourse.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  if (!actor.memberships.some((membership) =>
    membership.role === "provider" &&
    membership.providerId === parsed.data.providerId)) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  try {
    const result = await createSupervisedCourse(actor.userId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201, headers: noStore,
    });
  } catch (err) {
    if (!(err instanceof CourseWorkflowError)) throw err;
    const status = err.kind === "institute_unavailable" || err.kind === "scope_invalid"
      ? 404 : err.kind === "provider_not_active" ? 403 : 409;
    return NextResponse.json({ error: err.kind }, { status, headers: noStore });
  }
}
