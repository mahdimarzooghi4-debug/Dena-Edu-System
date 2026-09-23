import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { courses, supervisionGrants } from "../../db/schema";

/** A limited overview, not an approval grant or access to student identities. */
export async function getInstituteDashboardCourses(instituteIds: readonly string[]) {
  if (!instituteIds.length) return { courses: [], hasMore: false };
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    supervisionStatus: supervisionGrants.status,
    publicationStatus: courses.publicationStatus,
  }).from(supervisionGrants).innerJoin(courses, and(
    eq(courses.id, supervisionGrants.courseId),
    eq(courses.providerId, supervisionGrants.providerId),
    eq(courses.responsibleInstituteId, supervisionGrants.instituteId),
  )).where(inArray(supervisionGrants.instituteId, [...instituteIds]))
    .orderBy(desc(supervisionGrants.requestedAt), asc(courses.id))
    .limit(21);
  return { courses: rows.slice(0, 20), hasMore: rows.length > 20 };
}
