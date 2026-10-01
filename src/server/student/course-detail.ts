import { and, count, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../../db";
import {
  courses, privateMediaAssets, providerInstituteCollaborations,
  studentEnrollments, supervisionGrants, verifiedEntities,
} from "../../db/schema";
import { listedFreeCourse } from "./entitlement";

const provider = alias(verifiedEntities, "student_catalog_provider");
const institute = alias(verifiedEntities, "student_catalog_institute");

/**
 * Only active-student callers with a trusted session use this reader.
 * Before enrollment, show ONLY currently listed public course metadata:
 * never asset IDs/titles, object keys, private notes, enrollment owner IDs,
 * reviewer IDs, evidence references or any other student's data.
 */
export async function getStudentCourseDetail(studentUserId: string, courseId: string) {
  const db = getDb();
  const [detail] = await db.select({
    courseId: courses.id,
    title: courses.title,
    publishedAt: courses.publishedAt,
    providerName: provider.name,
    providerCollaborationApproved: sql<boolean>`${providerInstituteCollaborations.id} IS NOT NULL`,
    responsibleInstituteName: institute.name,
    readyVideoCount: count(privateMediaAssets.id),
    enrollmentStatus: studentEnrollments.status,
  }).from(courses)
    .innerJoin(supervisionGrants,
      eq(supervisionGrants.courseId, courses.id))
    .innerJoin(provider, and(
      eq(provider.id, courses.providerId), eq(provider.role, "provider"),
    ))
    .innerJoin(institute, and(
      eq(institute.id, courses.responsibleInstituteId),
      eq(institute.role, "institute"),
    ))
    .leftJoin(providerInstituteCollaborations, and(
      eq(providerInstituteCollaborations.providerId, courses.providerId),
      eq(providerInstituteCollaborations.instituteId, courses.responsibleInstituteId),
      eq(providerInstituteCollaborations.status, "approved"),
    ))
    .innerJoin(privateMediaAssets, and(
      eq(privateMediaAssets.courseId, courses.id),
      eq(privateMediaAssets.status, "ready"),
    ))
    .leftJoin(studentEnrollments, and(
      eq(studentEnrollments.courseId, courses.id),
      eq(studentEnrollments.studentUserId, studentUserId),
    ))
    .where(and(
      eq(courses.id, courseId),
      listedFreeCourse(db),
    ))
    .groupBy(
      courses.id, courses.title, courses.publishedAt,
      provider.name, institute.name, studentEnrollments.status,
      providerInstituteCollaborations.id,
    )
    .limit(1);
  return detail ?? null;
}
