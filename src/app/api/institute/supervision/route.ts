import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import { courses, supervisionGrants } from "../../../../db/schema";
import { getServerAccessContext } from "../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const ownScopes = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!ownScopes.length) return NextResponse.json({ error: "Forbidden" }, {
    status: 403, headers: noStore,
  });

  const rows = await getDb().select({
    courseId: courses.id,
    title: courses.title,
    providerId: courses.providerId,
    responsibleInstituteId: courses.responsibleInstituteId,
    supervisionStatus: supervisionGrants.status,
    requestedAt: supervisionGrants.requestedAt,
  }).from(supervisionGrants).innerJoin(
    courses, eq(courses.id, supervisionGrants.courseId),
  ).where(inArray(supervisionGrants.instituteId, ownScopes))
    .orderBy(asc(supervisionGrants.status), asc(supervisionGrants.requestedAt))
    .limit(50);
  return NextResponse.json({ courses: rows }, { headers: noStore });
}
