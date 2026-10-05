import { and, eq, exists, inArray, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../../db";
import {
  courses, educatorInstituteAffiliations, memberships, privateMediaAssets,
  studentEnrollments, supervisionGrants,
} from "../../db/schema";

const provider = alias(memberships, "free_course_provider");
const institute = alias(memberships, "free_course_institute");
const approver = alias(memberships, "free_course_approver");
const student = alias(memberships, "free_course_student");
const independentAffiliation = alias(
  educatorInstituteAffiliations, "free_course_independent_affiliation",
);

function validSupervision(db: ReturnType<typeof getDb>) { return and(
  eq(supervisionGrants.status, "approved"),
  eq(supervisionGrants.courseId, courses.id),
  eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  eq(supervisionGrants.ownerType, courses.ownerType),
  exists(db.select({ id: institute.id }).from(institute).where(and(
    eq(institute.role, "institute"), eq(institute.status, "active"),
    eq(institute.instituteId, courses.responsibleInstituteId),
  ))),
  or(
    and(
      eq(courses.ownerType, "verified_provider"),
      eq(supervisionGrants.providerId, courses.providerId),
      isNull(courses.independentEducatorProfileId),
      exists(db.select({ id: provider.id }).from(provider).where(and(
        eq(provider.role, "provider"), eq(provider.status, "active"),
        eq(provider.providerId, courses.providerId),
      ))),
      exists(db.select({ id: approver.id }).from(approver).where(and(
        eq(approver.userId, supervisionGrants.approvedByInstituteUserId),
        eq(approver.role, "institute"), eq(approver.status, "active"),
        eq(approver.instituteId, courses.responsibleInstituteId),
      ))),
    ),
    and(
      eq(courses.ownerType, "independent_educator"),
      eq(supervisionGrants.independentEducatorProfileId,
        courses.independentEducatorProfileId),
      isNull(courses.providerId),
      exists(db.select({ id: independentAffiliation.id })
        .from(independentAffiliation).where(and(
          eq(independentAffiliation.educatorProfileId,
            courses.independentEducatorProfileId),
          eq(independentAffiliation.instituteId, courses.responsibleInstituteId),
          eq(independentAffiliation.status, "approved"),
        ))),
      exists(db.select({ id: approver.id }).from(approver).where(and(
        eq(approver.userId, supervisionGrants.approvedByInstituteUserId),
        eq(approver.role, "institute"), eq(approver.status, "active"),
        eq(approver.instituteId, courses.responsibleInstituteId),
      ))),
    ),
    and(
      eq(courses.ownerType, "institute"),
      isNull(courses.providerId),
      isNull(courses.independentEducatorProfileId),
      isNull(supervisionGrants.providerId),
      isNull(supervisionGrants.independentEducatorProfileId),
    ),
  ),
); }

/** Base conditions are applied again on *every* catalog, enrollment, asset
 * manifest and byte-range request. No role, courseId or enrollment from client
 * is an authorization token.
 */
export function listedFreeCourse(db: ReturnType<typeof getDb>) { return and(
  eq(courses.publicationStatus, "published"), validSupervision(db),
  exists(db.select({ id: privateMediaAssets.id })
    .from(privateMediaAssets).where(and(
      eq(privateMediaAssets.courseId, courses.id),
      eq(privateMediaAssets.status, "ready"),
    ))),
); }

export async function hasStudentEntitlement(
  studentUserId: string, courseId: string,
): Promise<boolean> {
  const db = getDb();
  const [access] = await db.select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
    .innerJoin(supervisionGrants,
      eq(supervisionGrants.courseId, courses.id))
    .where(and(
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.courseId, courseId),
      eq(studentEnrollments.status, "active"),
      exists(db.select({ id: student.id }).from(student).where(and(
        eq(student.userId, studentUserId),
        eq(student.role, "student"), eq(student.status, "active"),
      ))),
      listedFreeCourse(db),
    )).limit(1);
  return Boolean(access);
}


export function studentCourseEntitlementKey(
  studentUserId: string,
  courseId: string,
): string {
  return `${studentUserId}:${courseId}`;
}

/**
 * Batch entitlement recheck for inbox/report surfaces.
 * One bounded query replaces N per-row authorization queries.
 */
export async function getStudentCourseEntitlementKeys(
  pairs: readonly { studentUserId: string; courseId: string }[],
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set();

  const studentIds = [...new Set(pairs.map((pair) => pair.studentUserId))];
  const courseIds = [...new Set(pairs.map((pair) => pair.courseId))];
  const db = getDb();

  const rows = await db.select({
    studentUserId: studentEnrollments.studentUserId,
    courseId: studentEnrollments.courseId,
  }).from(studentEnrollments)
    .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
    .innerJoin(supervisionGrants, eq(supervisionGrants.courseId, courses.id))
    .where(and(
      inArray(studentEnrollments.studentUserId, studentIds),
      inArray(studentEnrollments.courseId, courseIds),
      eq(studentEnrollments.status, "active"),
      exists(db.select({ id: student.id }).from(student).where(and(
        eq(student.userId, studentEnrollments.studentUserId),
        eq(student.role, "student"),
        eq(student.status, "active"),
      ))),
      listedFreeCourse(db),
    ));

  return new Set(rows.map((row) =>
    studentCourseEntitlementKey(row.studentUserId, row.courseId),
  ));
}
