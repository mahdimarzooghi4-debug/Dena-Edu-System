import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courses, memberships, studentEnrollments, supervisionGrants,
} from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";

export type StudentEnrollmentErrorKind =
  | "not_student" | "not_available" | "enrollment_cancelled";
export class StudentEnrollmentError extends Error {
  constructor(readonly kind: StudentEnrollmentErrorKind) { super(kind); }
}

/** Free enrollment only. All role/grant/pub checks are row-locked within one
 * transaction; a repeated call can only return the user's existing ACTIVE row.
 * Never resurrect a cancelled membership.
 */
export async function enrollFreeCourse(
  studentUserId: string, courseId: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [member] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, studentUserId),
        eq(memberships.role, "student"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!member) throw new StudentEnrollmentError("not_student");
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("share");
    if (!course || course.publicationStatus !== "published") {
      throw new StudentEnrollmentError("not_available");
    }
    const [grant] = await tx.select().from(supervisionGrants)
      .where(and(
        eq(supervisionGrants.courseId, courseId),
        eq(supervisionGrants.providerId, course.providerId),
        eq(supervisionGrants.instituteId, course.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
      )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) {
      throw new StudentEnrollmentError("not_available");
    }
    const active = await tx.select({
      id: memberships.id, role: memberships.role,
      providerId: memberships.providerId, instituteId: memberships.instituteId,
      userId: memberships.userId,
    }).from(memberships).where(and(
      eq(memberships.status, "active"),
    )).for("share");
    const providerActive = active.some((row) =>
      row.role === "provider" && row.providerId === course.providerId);
    const instituteActive = active.some((row) =>
      row.role === "institute" && row.instituteId === course.responsibleInstituteId);
    const approverActive = active.some((row) =>
      row.role === "institute" && row.userId === grant.approvedByInstituteUserId &&
      row.instituteId === course.responsibleInstituteId);
    if (!providerActive || !instituteActive || !approverActive) {
      throw new StudentEnrollmentError("not_available");
    }

    const [created] = await tx.insert(studentEnrollments).values({
      studentUserId, courseId,
    }).onConflictDoNothing({
      target: [studentEnrollments.studentUserId, studentEnrollments.courseId],
    }).returning({ id: studentEnrollments.id });
    if (created) return { courseId, enrolled: true, replayed: false };

    const [existing] = await tx.select({
      status: studentEnrollments.status,
    }).from(studentEnrollments).where(and(
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.courseId, courseId),
    )).limit(1);
    if (existing?.status !== "active") {
      throw new StudentEnrollmentError("enrollment_cancelled");
    }
    return { courseId, enrolled: true, replayed: true };
  });
}
