import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseTeamMembers,
  courses,
  memberships,
  privateMediaAssets,
  studentEnrollments,
  supervisionGrants,
  user,
} from "../../db/schema";

export const courseTeamAssignmentInput = z.object({
  memberUserId: z.uuid(),
  role: z.enum(["teacher", "academic_supporter", "counselor"]),
}).strict();

export const courseTeamSessionRequestPolicyInput = z.object({
  enabled: z.boolean(),
}).strict();

export type CourseTeamAssignmentInput =
  z.infer<typeof courseTeamAssignmentInput>;

async function instituteScope(
  instituteUserId: string,
  courseId: string,
) {
  const db = getDb();
  const [scope] = await db.select({
    courseId: courses.id,
    instituteId: courses.responsibleInstituteId,
  }).from(courses)
    .innerJoin(memberships, and(
      eq(memberships.userId, instituteUserId),
      eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
      eq(memberships.instituteId, courses.responsibleInstituteId),
    ))
    .where(eq(courses.id, courseId))
    .limit(1);
  return scope ?? null;
}

/** Institute-facing list. Contact/auth data is deliberately absent. */
export async function getInstituteCourseTeam(
  instituteUserId: string,
  courseId: string,
) {
  const scope = await instituteScope(instituteUserId, courseId);
  if (!scope) return null;

  return getDb().select({
    teamMemberId: courseTeamMembers.id,
    memberUserId: courseTeamMembers.memberUserId,
    name: user.name,
    role: courseTeamMembers.role,
    status: courseTeamMembers.status,
    assignedAt: courseTeamMembers.assignedAt,
    endedAt: courseTeamMembers.endedAt,
    studentSessionRequestsEnabled:
      courseTeamMembers.studentSessionRequestsEnabled,
  }).from(courseTeamMembers)
    .innerJoin(user, eq(user.id, courseTeamMembers.memberUserId))
    .where(eq(courseTeamMembers.courseId, courseId));
}

/**
 * The institute defines the role on the course. The assignee does not gain a
 * global Dena role, and the client cannot choose an institute scope.
 */
export async function assignInstituteCourseTeamMember(
  instituteUserId: string,
  courseId: string,
  input: CourseTeamAssignmentInput,
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const scope = await instituteScope(instituteUserId, courseId);
    if (!scope) return null;

    const [target] = await tx.select({ id: user.id }).from(user)
      .where(eq(user.id, input.memberUserId))
      .limit(1);
    if (!target) return null;

    const [existing] = await tx.select({
      id: courseTeamMembers.id,
      status: courseTeamMembers.status,
    }).from(courseTeamMembers)
      .where(and(
        eq(courseTeamMembers.courseId, courseId),
        eq(courseTeamMembers.memberUserId, input.memberUserId),
        eq(courseTeamMembers.role, input.role),
      ))
      .limit(1)
      .for("update");

    if (existing?.status === "active") {
      return { teamMemberId: existing.id, replayed: true };
    }

    if (existing?.status === "inactive") {
      const [reactivated] = await tx.update(courseTeamMembers).set({
        status: "active",
        endedAt: null,
        studentSessionRequestsEnabled: false,
        assignedByInstituteUserId: instituteUserId,
        assignedAt: new Date(),
      }).where(eq(courseTeamMembers.id, existing.id))
        .returning({ id: courseTeamMembers.id });
      if (!reactivated) throw new Error("course_team_reactivation_failed");
      return { teamMemberId: reactivated.id, replayed: false };
    }

    const [created] = await tx.insert(courseTeamMembers).values({
      courseId,
      instituteId: scope.instituteId,
      memberUserId: input.memberUserId,
      role: input.role,
      assignedByInstituteUserId: instituteUserId,
    }).returning({ id: courseTeamMembers.id });

    if (!created) throw new Error("course_team_assignment_failed");
    return { teamMemberId: created.id, replayed: false };
  });
}

export async function deactivateInstituteCourseTeamMember(
  instituteUserId: string,
  courseId: string,
  teamMemberId: string,
) {
  const scope = await instituteScope(instituteUserId, courseId);
  if (!scope) return null;

  const [updated] = await getDb().update(courseTeamMembers).set({
    status: "inactive",
    endedAt: new Date(),
    studentSessionRequestsEnabled: false,
  }).where(and(
    eq(courseTeamMembers.id, teamMemberId),
    eq(courseTeamMembers.courseId, courseId),
    eq(courseTeamMembers.instituteId, scope.instituteId),
    eq(courseTeamMembers.status, "active"),
  )).returning({ id: courseTeamMembers.id });

  return updated ? { teamMemberId: updated.id } : null;
}


export async function setInstituteCourseTeamSessionRequestPolicy(
  instituteUserId: string,
  courseId: string,
  teamMemberId: string,
  enabled: boolean,
) {
  const scope = await instituteScope(instituteUserId, courseId);
  if (!scope) return null;

  const [updated] = await getDb().update(courseTeamMembers).set({
    studentSessionRequestsEnabled: enabled,
  }).where(and(
    eq(courseTeamMembers.id, teamMemberId),
    eq(courseTeamMembers.courseId, courseId),
    eq(courseTeamMembers.instituteId, scope.instituteId),
    eq(courseTeamMembers.role, "academic_supporter"),
    eq(courseTeamMembers.status, "active"),
  )).returning({
    teamMemberId: courseTeamMembers.id,
    studentSessionRequestsEnabled:
      courseTeamMembers.studentSessionRequestsEnabled,
  });

  return updated ?? null;
}


/** Instructor directory for courses the signed-in institute currently supervises. */
export async function getInstituteInstructorDirectory(
  instituteIds: readonly string[],
) {
  if (!instituteIds.length) return [];

  return getDb().select({
    teamMemberId: courseTeamMembers.id,
    name: user.name,
    role: courseTeamMembers.role,
    status: courseTeamMembers.status,
    courseId: courses.id,
    courseTitle: courses.title,
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
    .where(and(
      inArray(courseTeamMembers.instituteId, [...instituteIds]),
      eq(courseTeamMembers.role, "teacher"),
    ))
    .groupBy(
      courseTeamMembers.id,
      courseTeamMembers.memberUserId,
      courseTeamMembers.role,
      courseTeamMembers.status,
      courses.id,
      courses.title,
      user.id,
      user.name,
    )
    .orderBy(asc(user.name), asc(courses.title))
    .limit(1000);
}


/** A teacher profile and course media, restricted to approved institute scopes. */
export async function getInstituteInstructorDetail(
  instituteIds: readonly string[],
  teamMemberId: string,
) {
  if (!instituteIds.length) return null;
  const db = getDb();
  const [selected] = await db.select({
    memberUserId: courseTeamMembers.memberUserId,
  }).from(courseTeamMembers)
    .innerJoin(courses, eq(courses.id, courseTeamMembers.courseId))
    .innerJoin(supervisionGrants, and(
      eq(supervisionGrants.courseId, courses.id),
      eq(supervisionGrants.ownerType, courses.ownerType),
      eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
      inArray(supervisionGrants.instituteId, [...instituteIds]),
    ))
    .where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.role, "teacher"),
      inArray(courseTeamMembers.instituteId, [...instituteIds]),
    ))
    .limit(1);
  if (!selected) return null;

  const rows = await db.select({
    teamMemberId: courseTeamMembers.id,
    memberUserId: courseTeamMembers.memberUserId,
    name: user.name,
    status: courseTeamMembers.status,
    assignedAt: courseTeamMembers.assignedAt,
    courseId: courses.id,
    courseTitle: courses.title,
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
    .where(and(
      eq(courseTeamMembers.memberUserId, selected.memberUserId),
      eq(courseTeamMembers.role, "teacher"),
      inArray(courseTeamMembers.instituteId, [...instituteIds]),
    ))
    .orderBy(asc(courses.title), asc(courseTeamMembers.assignedAt))
    .limit(200);
  if (!rows.length) return null;

  const courseIds = [...new Set(rows.map((row) => row.courseId))];
  const [enrollmentRows, recordingRows] = await Promise.all([
    db.select({
      courseId: studentEnrollments.courseId,
      activeStudents: count(studentEnrollments.id),
    }).from(studentEnrollments)
      .where(and(
        inArray(studentEnrollments.courseId, courseIds),
        eq(studentEnrollments.status, "active"),
      ))
      .groupBy(studentEnrollments.courseId),
    db.select({
      assetId: privateMediaAssets.id,
      courseId: privateMediaAssets.courseId,
      title: privateMediaAssets.title,
      createdAt: privateMediaAssets.createdAt,
    }).from(privateMediaAssets)
      .where(and(
        inArray(privateMediaAssets.courseId, courseIds),
        eq(privateMediaAssets.status, "ready"),
      ))
      .orderBy(desc(privateMediaAssets.createdAt), desc(privateMediaAssets.id))
      .limit(200),
  ]);
  const activeStudentsByCourse = new Map(enrollmentRows.map((row) =>
    [row.courseId, row.activeStudents] as const));
  return {
    name: rows[0]!.name,
    active: rows.some((row) => row.status === "active"),
    assignedAt: rows.reduce((earliest, row) =>
      row.assignedAt < earliest ? row.assignedAt : earliest, rows[0]!.assignedAt),
    courses: rows.map((row) => ({
      teamMemberId: row.teamMemberId,
      courseId: row.courseId,
      title: row.courseTitle,
      activeStudents: activeStudentsByCourse.get(row.courseId) ?? 0,
      active: row.status === "active",
    })),
    recordings: recordingRows.map((recording) => ({
      ...recording,
      courseTitle: rows.find((row) => row.courseId === recording.courseId)?.courseTitle ?? "",
    })),
  };
}
