import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courses, educatorInstituteAffiliations, memberships, privateMediaAssets,
  studentEnrollments, supervisionGrants,
} from "../../db/schema";
import { isVerifiedProviderCourse } from "../courses/ownership";

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
        eq(supervisionGrants.instituteId, course.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
      )).limit(1).for("share");
    if (!grant?.approvedAt || grant.ownerType !== course.ownerType ||
        grant.providerId !== course.providerId ||
        grant.independentEducatorProfileId !== course.independentEducatorProfileId) {
      throw new StudentEnrollmentError("not_available");
    }
    const [media] = await tx.select({ id: privateMediaAssets.id })
      .from(privateMediaAssets).where(and(
        eq(privateMediaAssets.courseId, courseId),
        eq(privateMediaAssets.status, "ready"),
      )).limit(1).for("share");
    if (!media) throw new StudentEnrollmentError("not_available");
    const [instituteActive] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.responsibleInstituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!instituteActive) throw new StudentEnrollmentError("not_available");

    let ownerActive = course.ownerType === "institute";
    if (isVerifiedProviderCourse(course)) {
      const [providerActive] = await tx.select({ id: memberships.id })
        .from(memberships).where(and(
          eq(memberships.role, "provider"),
          eq(memberships.providerId, course.providerId),
          eq(memberships.status, "active"),
        )).limit(1).for("share");
      const [approverActive] = await tx.select({ id: memberships.id })
        .from(memberships).where(and(
          eq(memberships.userId, grant.approvedByInstituteUserId!),
          eq(memberships.role, "institute"),
          eq(memberships.instituteId, course.responsibleInstituteId),
          eq(memberships.status, "active"),
        )).limit(1).for("share");
      ownerActive = Boolean(providerActive && approverActive);
    } else if (course.ownerType === "independent_educator" &&
        course.independentEducatorProfileId) {
      const [activeAffiliation] = await tx.select({ id: educatorInstituteAffiliations.id })
        .from(educatorInstituteAffiliations).where(and(
          eq(educatorInstituteAffiliations.educatorProfileId,
            course.independentEducatorProfileId),
          eq(educatorInstituteAffiliations.instituteId, course.responsibleInstituteId),
          eq(educatorInstituteAffiliations.status, "approved"),
        )).limit(1).for("share");
      const [approverActive] = await tx.select({ id: memberships.id })
        .from(memberships).where(and(
          eq(memberships.userId, grant.approvedByInstituteUserId!),
          eq(memberships.role, "institute"),
          eq(memberships.instituteId, course.responsibleInstituteId),
          eq(memberships.status, "active"),
        )).limit(1).for("share");
      ownerActive = Boolean(activeAffiliation && approverActive);
    }
    if (!ownerActive) {
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
