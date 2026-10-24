import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  privateMediaAssets, studentEnrollments, studentVideoCompletions, studentVideoNotes,
} from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";

async function hasLockedStudentEntitlement(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  studentUserId: string,
  courseId: string,
) {
  const [enrollment] = await tx.select({ id: studentEnrollments.id })
    .from(studentEnrollments).where(and(
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.courseId, courseId),
      eq(studentEnrollments.status, "active"),
    )).limit(1).for("share");
  return Boolean(enrollment && await hasStudentEntitlement(studentUserId, courseId));
}

async function isReadyAsset(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  courseId: string,
  assetId: string,
) {
  const [video] = await tx.select({ id: privateMediaAssets.id })
    .from(privateMediaAssets).where(and(
      eq(privateMediaAssets.courseId, courseId),
      eq(privateMediaAssets.id, assetId),
      eq(privateMediaAssets.status, "ready"),
    )).limit(1);
  return Boolean(video);
}

/** Call only after hasStudentEntitlement. Media is rechecked for course and
 * ready status; completion is a voluntary marker, never watching evidence.
 */
export async function getStudentVideoProgress(studentUserId: string, courseId: string) {
  return getDb().select({
    assetId: privateMediaAssets.id,
    title: privateMediaAssets.title,
    completed: sql<boolean>`${studentVideoCompletions.id} IS NOT NULL`,
    note: studentVideoNotes.body,
  }).from(privateMediaAssets).leftJoin(studentVideoCompletions, and(
    eq(studentVideoCompletions.studentUserId, studentUserId),
    eq(studentVideoCompletions.assetId, privateMediaAssets.id),
  )).leftJoin(studentVideoNotes, and(
    eq(studentVideoNotes.studentUserId, studentUserId),
    eq(studentVideoNotes.assetId, privateMediaAssets.id),
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

/** Completion changes share the enrollment row lock with cancellation. */
export async function setStudentVideoCompletion(
  studentUserId: string, courseId: string, assetId: string, completed: boolean,
) {
  return getDb().transaction(async (tx) => {
    if (!await hasLockedStudentEntitlement(tx, studentUserId, courseId) ||
        !await isReadyAsset(tx, courseId, assetId)) return null;
    if (!completed) {
      await tx.delete(studentVideoCompletions).where(and(
        eq(studentVideoCompletions.studentUserId, studentUserId),
        eq(studentVideoCompletions.assetId, assetId),
      ));
      return { created: false };
    }
    const [created] = await tx.insert(studentVideoCompletions).values({
      studentUserId, assetId,
    }).onConflictDoNothing({
      target: [studentVideoCompletions.studentUserId, studentVideoCompletions.assetId],
    }).returning({ id: studentVideoCompletions.id });
    return { created: Boolean(created) };
  });
}

/** Private-note writes and deletes also serialize with enrollment cancellation. */
export async function setStudentVideoNote(
  studentUserId: string, courseId: string, assetId: string, note: string | null,
) {
  return getDb().transaction(async (tx) => {
    if (!await hasLockedStudentEntitlement(tx, studentUserId, courseId) ||
        !await isReadyAsset(tx, courseId, assetId)) return false;
    if (note === null) {
      await tx.delete(studentVideoNotes).where(and(
        eq(studentVideoNotes.studentUserId, studentUserId),
        eq(studentVideoNotes.assetId, assetId),
      ));
    } else {
      await tx.insert(studentVideoNotes).values({
        studentUserId, assetId, body: note,
      }).onConflictDoUpdate({
        target: [studentVideoNotes.studentUserId, studentVideoNotes.assetId],
        set: { body: note, updatedAt: new Date() },
      });
    }
    return true;
  });
}
