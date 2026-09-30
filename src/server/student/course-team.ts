import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courseTeamMembers,
  courses,
  user,
} from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";

export type StudentCourseTeamRole =
  | "teacher"
  | "academic_supporter"
  | "counselor";

export type StudentCourseTeamMember = {
  teamMemberId: string;
  name: string;
  role: StudentCourseTeamRole;
};

/**
 * Student-visible course team data is deliberately minimal.
 * Never return team-member phone, email, auth identifiers or unrelated roles.
 */
export async function getStudentCourseTeam(
  studentUserId: string,
  courseId: string,
): Promise<StudentCourseTeamMember[] | null> {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;

  return getDb().select({
    teamMemberId: courseTeamMembers.id,
    name: user.name,
    role: courseTeamMembers.role,
  }).from(courseTeamMembers)
    .innerJoin(user, eq(user.id, courseTeamMembers.memberUserId))
    .where(and(
      eq(courseTeamMembers.courseId, courseId),
      eq(courseTeamMembers.status, "active"),
    ))
    .orderBy(asc(courseTeamMembers.role), asc(user.name));
}

export async function getStudentCourseTeamMember(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;

  const [member] = await getDb().select({
    teamMemberId: courseTeamMembers.id,
    name: user.name,
    role: courseTeamMembers.role,
    courseTitle: courses.title,
  }).from(courseTeamMembers)
    .innerJoin(user, eq(user.id, courseTeamMembers.memberUserId))
    .innerJoin(courses, eq(courses.id, courseTeamMembers.courseId))
    .where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.courseId, courseId),
      eq(courseTeamMembers.status, "active"),
    ))
    .limit(1);

  return member ?? null;
}
