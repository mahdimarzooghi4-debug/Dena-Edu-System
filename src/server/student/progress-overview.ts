import { and, asc, count, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courses, privateMediaAssets, studentEnrollments, studentVideoCompletions,
  supervisionGrants,
} from "../../db/schema";
import { listedFreeCourse } from "./entitlement";

/**
 * A read-only personal summary of self-reported video markers, NOT
 * watched-time, quiz achievement or proof of learning. Only CURRENTLY
 * accessible free enrollments are eligible; withdrawn assets do not count.
 *
 * Counts cover up to 20 most recently enrolled accessible courses, not all
 * historical courses. No third-party identities or object storage keys.
 */
export async function getStudentProgressOverview(studentUserId: string) {
  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    enrolledAt: studentEnrollments.enrolledAt,
    readyVideos: count(privateMediaAssets.id),
    markedVideos: count(studentVideoCompletions.id),
  }).from(studentEnrollments)
    .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
    .innerJoin(supervisionGrants, eq(supervisionGrants.courseId, courses.id))
    .leftJoin(privateMediaAssets, and(
      eq(privateMediaAssets.courseId, courses.id),
      eq(privateMediaAssets.status, "ready"),
    ))
    .leftJoin(studentVideoCompletions, and(
      eq(studentVideoCompletions.assetId, privateMediaAssets.id),
      eq(studentVideoCompletions.studentUserId, studentUserId),
    ))
    .where(and(
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.status, "active"),
      listedFreeCourse(db),
    ))
    .groupBy(courses.id, courses.title, studentEnrollments.enrolledAt)
    .orderBy(desc(studentEnrollments.enrolledAt), asc(courses.id))
    .limit(21);
  const visible = rows.slice(0, 20).map((row) => ({
    courseId: row.courseId,
    title: row.title,
    readyVideos: row.readyVideos,
    markedVideos: row.markedVideos,
  }));
  return {
    courses: visible,
    hasMore: rows.length > 20,
    displayedReadyVideos: visible.reduce((total, row) => total + row.readyVideos, 0),
    displayedMarkedVideos: visible.reduce((total, row) => total + row.markedVideos, 0),
  };
}
