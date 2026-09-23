import { count, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { studentVideoNotes } from "../../db/schema";

/** Includes notes for withdrawn videos and cancelled enrollments.
 * No course entitlement is used here: owners must be able to erase retained
 * personal notes even when study access has been revoked. Never select body.
 */
export async function countStudentVideoNotes(studentUserId: string) {
  const [result] = await getDb().select({
    noteCount: count(studentVideoNotes.id),
  }).from(studentVideoNotes).where(
    eq(studentVideoNotes.studentUserId, studentUserId),
  );
  return result?.noteCount ?? 0;
}

/** Deletion is scoped by the trusted server-side session, not course or
 * asset IDs supplied by the caller. Completion rows are deliberately intact.
 */
export async function deleteAllStudentVideoNotes(studentUserId: string) {
  const deleted = await getDb().delete(studentVideoNotes).where(
    eq(studentVideoNotes.studentUserId, studentUserId),
  ).returning({ id: studentVideoNotes.id });
  return deleted.length;
}
