import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../db";
import { courses, supervisionGrants } from "../../../../../db/schema";
import {
  canManageSupervisedCourse, canOverseeProviderCourse,
} from "../../../../../domain/access/policy";
import { getServerAccessContext } from "../../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });

  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const db = getDb();
  const [course] = await db.select({
    id: courses.id,
    providerId: courses.providerId,
    responsibleInstituteId: courses.responsibleInstituteId,
  }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const [grant] = await db.select().from(supervisionGrants)
    .where(and(
      eq(supervisionGrants.courseId, course.id),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
    )).limit(1);

  const supervision = grant ? {
    ...grant,
    approvedAt: grant.approvedAt?.toISOString() ?? null,
  } : null;
  // This endpoint authorizes provider/institute oversight ONLY; it must never
  // be interpreted as a student's enrollment or permission to stream media.
  if (!canManageSupervisedCourse(actor, course, supervision) &&
      !canOverseeProviderCourse(actor, course, supervision)) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  return NextResponse.json({ courseId: course.id, authorized: true }, {
    headers: noStore,
  });
}
