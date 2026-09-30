import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseTeamMembers,
  problemSolvingRequests,
  problemSolvingSessions,
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

export async function createStudentProblemSolvingRequest(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
  input: z.infer<typeof problemSolvingRequestInput>,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  const supporter = await supporterScope(courseId, teamMemberId);
  if (!supporter || !supporter.requestsEnabled) return null;

  const [created] = await getDb().insert(problemSolvingRequests).values({
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
}
