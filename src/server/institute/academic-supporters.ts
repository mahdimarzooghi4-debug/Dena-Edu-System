import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courseTeamMembers,
  courses,
  studentEnrollments,
  supervisionGrants,
  user,
} from "../../db/schema";

export async function getInstituteAcademicSupporters(
  instituteIds: readonly string[],
) {
  if (!instituteIds.length) return [];

  const rows = await getDb().select({
    teamMemberId: courseTeamMembers.id,
    memberUserId: courseTeamMembers.memberUserId,
    name: user.name,
    status: courseTeamMembers.status,
    assignedAt: courseTeamMembers.assignedAt,
    courseId: courses.id,
    courseTitle: courses.title,
    activeStudents: count(studentEnrollments.id),
  }).from(courseTeamMembers)
    .innerJoin(courses, eq(courses.id, courseTeamMembers.courseId))
    .innerJoin(supervisionGrants, and(
      eq(supervisionGrants.courseId, courses.id),
      eq(supervisionGrants.ownerType, courses.ownerType),
      eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
      inArray(supervisionGrants.instituteId, [...instituteIds]),
    ))
    .innerJoin(user, eq(user.id, courseTeamMembers.memberUserId))
    .leftJoin(studentEnrollments, and(
      eq(studentEnrollments.courseId, courses.id),
      eq(studentEnrollments.status, "active"),
    ))
    .where(and(
      inArray(courseTeamMembers.instituteId, [...instituteIds]),
      eq(courseTeamMembers.role, "academic_supporter"),
    ))
    .groupBy(
      courseTeamMembers.id,
      courseTeamMembers.memberUserId,
      courseTeamMembers.status,
      courseTeamMembers.assignedAt,
      courses.id,
      courses.title,
      user.id,
      user.name,
    )
    .orderBy(asc(user.name), asc(courses.title))
    .limit(2000);

  const byMember = new Map<string, {
    memberUserId: string;
    name: string;
    courses: Array<{
      teamMemberId: string;
      courseId: string;
      title: string;
      status: "active" | "inactive";
      activeStudents: number;
    }>;
  }>();
  for (const row of rows) {
    const member = byMember.get(row.memberUserId) ?? {
      memberUserId: row.memberUserId,
      name: row.name,
      courses: [],
    };
    member.courses.push({
      teamMemberId: row.teamMemberId,
      courseId: row.courseId,
      title: row.courseTitle,
      status: row.status,
      activeStudents: row.activeStudents,
    });
    byMember.set(row.memberUserId, member);
  }

  return [...byMember.values()].map((member) => ({
    ...member,
    active: member.courses.some((course) => course.status === "active"),
    activeStudents: member.courses.reduce((total, course) =>
      total + course.activeStudents, 0),
  }));
}
