import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { courses, supervisionGrants } from "../../db/schema";

/** Scoped display only; publication and ingest must reauthorize transactionally. */
export async function getProviderDashboardCourses(providerIds: readonly string[]) {
  if (!providerIds.length) return { courses: [], hasMore: false };
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    supervisionStatus: supervisionGrants.status,
    publicationStatus: courses.publicationStatus,
  }).from(courses).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.providerId, courses.providerId),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).where(inArray(courses.providerId, [...providerIds]))
    .orderBy(desc(supervisionGrants.requestedAt), asc(courses.id))
    .limit(21);
  return { courses: rows.slice(0, 20), hasMore: rows.length > 20 };
}
