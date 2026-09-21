import { and, eq, exists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../../db";
import {
  courses, memberships, studentEnrollments, supervisionGrants,
} from "../../db/schema";

const provider = alias(memberships, "free_course_provider");
const institute = alias(memberships, "free_course_institute");
const approver = alias(memberships, "free_course_approver");
const student = alias(memberships, "free_course_student");

const validSupervision = and(
  eq(supervisionGrants.status, "approved"),
  eq(supervisionGrants.courseId, courses.id),
  eq(supervisionGrants.providerId, courses.providerId),
  eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  exists(getDb().select({ id: provider.id }).from(provider).where(and(
    eq(provider.role, "provider"), eq(provider.status, "active"),
    eq(provider.providerId, courses.providerId),
  ))),
  exists(getDb().select({ id: institute.id }).from(institute).where(and(
    eq(institute.role, "institute"), eq(institute.status, "active"),
    eq(institute.instituteId, courses.responsibleInstituteId),
  ))),
  exists(getDb().select({ id: approver.id }).from(approver).where(and(
    eq(approver.userId, supervisionGrants.approvedByInstituteUserId),
    eq(approver.role, "institute"), eq(approver.status, "active"),
    eq(approver.instituteId, courses.responsibleInstituteId),
  ))),
);

/** Base conditions are applied again on *every* catalog, enrollment, asset
 * manifest and byte-range request. No role, courseId or enrollment from client
 * is an authorization token.
 */
export const listedFreeCourse = and(
  eq(courses.publicationStatus, "published"), validSupervision,
);

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
      listedFreeCourse,
    )).limit(1);
  return Boolean(access);
}
