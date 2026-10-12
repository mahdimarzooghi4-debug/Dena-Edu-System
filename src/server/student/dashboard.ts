import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { courses, studentEnrollments, supervisionGrants } from "../../db/schema";
import { listedFreeCourse } from "./entitlement";

/**
 * Only list CURRENTLY accessible, actively enrolled free courses for the
 * authenticated student. This query is for display, never an authorization
 * substitute for each media request. Do not expose raw object keys or
 * speculative progress/assessment counts.
 */
export async function getStudentDashboardCourses(studentUserId: string) {
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    enrolledAt: studentEnrollments.enrolledAt,
  }).from(studentEnrollments)
    .innerJoin(courses, eq(studentEnrollments.courseId, courses.id))
    .innerJoin(supervisionGrants,
      eq(supervisionGrants.courseId, courses.id))
    .where(and(
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.status, "active"),
      listedFreeCourse(db),
    ))
    .orderBy(desc(studentEnrollments.enrolledAt), asc(courses.id))
    .limit(21);
  return { courses: rows.slice(0, 20), hasMore: rows.length > 20 };
}
