import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { privateMediaAssets, studentVideoCompletions } from "../../db/schema";

/** Call only after hasStudentEntitlement. Media is rechecked for course and
 * ready status; completion is a voluntary marker, never watching evidence.
 */
export async function getStudentVideoProgress(studentUserId: string, courseId: string) {
  return getDb().select({
    assetId: privateMediaAssets.id,
    title: privateMediaAssets.title,
    completed: sql<boolean>`${studentVideoCompletions.id} IS NOT NULL`,
  }).from(privateMediaAssets).leftJoin(studentVideoCompletions, and(
    eq(studentVideoCompletions.studentUserId, studentUserId),
    eq(studentVideoCompletions.assetId, privateMediaAssets.id),
  )).where(and(
    eq(privateMediaAssets.courseId, courseId),
    eq(privateMediaAssets.status, "ready"),
  )).orderBy(privateMediaAssets.createdAt, privateMediaAssets.id).limit(50);
}

/** Returns false when the requested asset is not currently available
 * in the entitled course (same 404 for other course and withdrawn asset).
 */
export async function isReadyVideoOfCourse(courseId: string, assetId: string) {
  const [video] = await getDb().select({ id: privateMediaAssets.id })
    .from(privateMediaAssets).where(and(
      eq(privateMediaAssets.courseId, courseId),
      eq(privateMediaAssets.id, assetId),
      eq(privateMediaAssets.status, "ready"),
    )).limit(1);
  return Boolean(video);
}
