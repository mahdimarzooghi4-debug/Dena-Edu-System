import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseTeamMembers,
  courses,
  problemSolvingRequests,
  problemSolvingSessions,
  studentEnrollments,
  user,
} from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";

const cleanText = (min: number, max: number) =>
  z.string().trim().min(min).max(max).refine((value) =>
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
  );

export const problemSolvingRequestInput = z.object({
  subject: cleanText(3, 160),
  description: cleanText(1, 1000).optional(),
}).strict();

async function supporterScope(courseId: string, teamMemberId: string) {
  const [supporter] = await getDb().select({
    teamMemberId: courseTeamMembers.id,
    requestsEnabled: courseTeamMembers.studentSessionRequestsEnabled,
  }).from(courseTeamMembers)
    .where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.courseId, courseId),
      eq(courseTeamMembers.role, "academic_supporter"),
      eq(courseTeamMembers.status, "active"),
    ))
    .limit(1);
  return supporter ?? null;
}

export async function getStudentProblemSolving(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  const supporter = await supporterScope(courseId, teamMemberId);
  if (!supporter) return null;

  const [requests, sessions] = await Promise.all([
    getDb().select({
      id: problemSolvingRequests.id,
      subject: problemSolvingRequests.subject,
      description: problemSolvingRequests.description,
      status: problemSolvingRequests.status,
      createdAt: problemSolvingRequests.createdAt,
      updatedAt: problemSolvingRequests.updatedAt,
    }).from(problemSolvingRequests)
      .where(and(
        eq(problemSolvingRequests.courseId, courseId),
        eq(problemSolvingRequests.studentUserId, studentUserId),
        eq(problemSolvingRequests.supporterTeamMemberId, teamMemberId),
      ))
      .orderBy(desc(problemSolvingRequests.createdAt))
      .limit(50),

    getDb().select({
      id: problemSolvingSessions.id,
      requestId: problemSolvingSessions.requestId,
      subject: problemSolvingSessions.subject,
      scheduledAt: problemSolvingSessions.scheduledAt,
      status: problemSolvingSessions.status,
    }).from(problemSolvingSessions)
      .where(and(
        eq(problemSolvingSessions.courseId, courseId),
        eq(problemSolvingSessions.studentUserId, studentUserId),
        eq(problemSolvingSessions.supporterTeamMemberId, teamMemberId),
      ))
      .orderBy(desc(problemSolvingSessions.scheduledAt))
      .limit(50),
  ]);

  return {
    requestsEnabled: supporter.requestsEnabled,
    requests,
    sessions,
  };
}

export async function getStudentProblemSolvingSession(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
  sessionId: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  const [session] = await getDb().select({
    id: problemSolvingSessions.id,
    subject: problemSolvingSessions.subject,
    scheduledAt: problemSolvingSessions.scheduledAt,
    status: problemSolvingSessions.status,
    courseId: courses.id,
    courseTitle: courses.title,
    teamMemberId: courseTeamMembers.id,
    supporterName: user.name,
  }).from(problemSolvingSessions)
    .innerJoin(courses, eq(courses.id, problemSolvingSessions.courseId))
    .innerJoin(courseTeamMembers, and(
      eq(courseTeamMembers.id, problemSolvingSessions.supporterTeamMemberId),
      eq(courseTeamMembers.courseId, problemSolvingSessions.courseId),
      eq(courseTeamMembers.role, "academic_supporter"),
      eq(courseTeamMembers.status, "active"),
    ))
    .innerJoin(user, eq(user.id, courseTeamMembers.memberUserId))
    .where(and(
      eq(problemSolvingSessions.id, sessionId),
      eq(problemSolvingSessions.courseId, courseId),
      eq(problemSolvingSessions.studentUserId, studentUserId),
      eq(problemSolvingSessions.supporterTeamMemberId, teamMemberId),
    ))
    .limit(1);
  return session ?? null;
}

export async function createStudentProblemSolvingRequest(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
  input: z.infer<typeof problemSolvingRequestInput>,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  return getDb().transaction(async (tx) => {
    const [supporter] = await tx.select({
      teamMemberId: courseTeamMembers.id,
      requestsEnabled: courseTeamMembers.studentSessionRequestsEnabled,
    }).from(courseTeamMembers).where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.courseId, courseId),
      eq(courseTeamMembers.role, "academic_supporter"),
      eq(courseTeamMembers.status, "active"),
    )).limit(1).for("share");
    if (!supporter?.requestsEnabled) return null;

    const [enrollment] = await tx.select({ id: studentEnrollments.id })
      .from(studentEnrollments).where(and(
        eq(studentEnrollments.studentUserId, studentUserId),
        eq(studentEnrollments.courseId, courseId),
        eq(studentEnrollments.status, "active"),
      )).limit(1).for("share");
    if (!enrollment || !await hasStudentEntitlement(studentUserId, courseId)) return null;

    const [created] = await tx.insert(problemSolvingRequests).values({
      courseId,
      studentUserId,
      supporterTeamMemberId: teamMemberId,
      subject: input.subject,
      description: input.description ?? null,
    }).returning({
      id: problemSolvingRequests.id,
      subject: problemSolvingRequests.subject,
      status: problemSolvingRequests.status,
      createdAt: problemSolvingRequests.createdAt,
    });

    return created ?? null;
  });
}
