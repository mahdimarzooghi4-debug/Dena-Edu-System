import { and, asc, eq, exists } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import {
  courses, studentEnrollments, supervisionGrants,
} from "../../../../db/schema";
import { getServerAccessContext } from "../../../../server/access/actor";
import { listedFreeCourse } from "../../../../server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id, title: courses.title,
    providerId: courses.providerId,
    responsibleInstituteId: courses.responsibleInstituteId,
    enrolled: exists(db.select({ id: studentEnrollments.id })
      .from(studentEnrollments).where(and(
        eq(studentEnrollments.courseId, courses.id),
        eq(studentEnrollments.studentUserId, actor.userId),
        eq(studentEnrollments.status, "active"),
      ))),
  }).from(courses).innerJoin(
    supervisionGrants, eq(supervisionGrants.courseId, courses.id),
  ).where(listedFreeCourse(db))
    .orderBy(asc(courses.title)).limit(50);
  return NextResponse.json({
    courses: rows.map((row) => ({ ...row, free: true })),
  }, { headers: noStore });
}
