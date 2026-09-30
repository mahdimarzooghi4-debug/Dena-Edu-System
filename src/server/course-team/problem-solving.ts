import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseTeamMembers,
  courses,
  problemSolvingRequests,
  problemSolvingSessions,
  user,
} from "../../db/schema";
import { hasStudentEntitlement } from "../student/entitlement";

const isoDateTime = z.string().trim().refine((value) => {
  const time = Date.parse(value);
  return Number.isFinite(time);
}, "invalid_datetime");

export const supporterProblemRequestDecision = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review") }).strict(),
  z.object({ action: z.literal("decline") }).strict(),
  z.object({
    action: z.literal("schedule"),
    scheduledAt: isoDateTime,
  }).strict(),
]);

export const supporterSessionDecision = z.object({
  status: z.enum(["held", "cancelled"]),
}).strict();

async function activeSupporter(memberUserId: string, teamMemberId: string) {
  const [assignment] = await getDb().select({
    teamMemberId: courseTeamMembers.id,
    courseId: courseTeamMembers.courseId,
    courseTitle: courses.title,
  }).from(courseTeamMembers)
    .innerJoin(courses, eq(courses.id, courseTeamMembers.courseId))
    .where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.memberUserId, memberUserId),
      eq(courseTeamMembers.role, "academic_supporter"),
      eq(courseTeamMembers.status, "active"),
    ))
    .limit(1);
  return assignment ?? null;
}

export async function getSupporterProblemSolving(
  memberUserId: string,
  teamMemberId: string,
) {
  const assignment = await activeSupporter(memberUserId, teamMemberId);
  if (!assignment) return null;

  const [requests, sessions] = await Promise.all([
    getDb().select({
      id: problemSolvingRequests.id,
      studentUserId: problemSolvingRequests.studentUserId,
      studentName: user.name,
      subject: problemSolvingRequests.subject,
      description: problemSolvingRequests.description,
      status: problemSolvingRequests.status,
      createdAt: problemSolvingRequests.createdAt,
      updatedAt: problemSolvingRequests.updatedAt,
    }).from(problemSolvingRequests)
      .innerJoin(user, eq(user.id, problemSolvingRequests.studentUserId))
      .where(and(
        eq(problemSolvingRequests.courseId, assignment.courseId),
        eq(problemSolvingRequests.supporterTeamMemberId, teamMemberId),
      ))
      .orderBy(desc(problemSolvingRequests.createdAt))
      .limit(100),

    getDb().select({
      id: problemSolvingSessions.id,
      requestId: problemSolvingSessions.requestId,
      studentUserId: problemSolvingSessions.studentUserId,
      studentName: user.name,
      subject: problemSolvingSessions.subject,
      scheduledAt: problemSolvingSessions.scheduledAt,
      status: problemSolvingSessions.status,
    }).from(problemSolvingSessions)
      .innerJoin(user, eq(user.id, problemSolvingSessions.studentUserId))
      .where(and(
        eq(problemSolvingSessions.courseId, assignment.courseId),
        eq(problemSolvingSessions.supporterTeamMemberId, teamMemberId),
      ))
      .orderBy(desc(problemSolvingSessions.scheduledAt))
      .limit(100),
  ]);

  return { assignment, requests, sessions };
}

export async function decideSupporterProblemRequest(
  memberUserId: string,
  teamMemberId: string,
  requestId: string,
  decision: z.infer<typeof supporterProblemRequestDecision>,
) {
  const assignment = await activeSupporter(memberUserId, teamMemberId);
  if (!assignment) return null;

  return getDb().transaction(async (tx) => {
    const [request] = await tx.select({
      id: problemSolvingRequests.id,
      studentUserId: problemSolvingRequests.studentUserId,
      subject: problemSolvingRequests.subject,
      status: problemSolvingRequests.status,
    }).from(problemSolvingRequests)
      .where(and(
        eq(problemSolvingRequests.id, requestId),
        eq(problemSolvingRequests.courseId, assignment.courseId),
        eq(problemSolvingRequests.supporterTeamMemberId, teamMemberId),
      ))
      .limit(1)
      .for("update");

    if (!request ||
        !await hasStudentEntitlement(
          request.studentUserId, assignment.courseId,
        )) return null;

    if (decision.action === "review") {
      if (request.status !== "submitted") return null;
      const [updated] = await tx.update(problemSolvingRequests).set({
        status: "under_review",
        updatedAt: new Date(),
      }).where(eq(problemSolvingRequests.id, requestId))
        .returning({ id: problemSolvingRequests.id });
      return updated ? { requestId, status: "under_review" as const } : null;
    }

    if (decision.action === "decline") {
      if (request.status !== "submitted" &&
          request.status !== "under_review") return null;
      const [updated] = await tx.update(problemSolvingRequests).set({
        status: "declined",
        updatedAt: new Date(),
      }).where(eq(problemSolvingRequests.id, requestId))
        .returning({ id: problemSolvingRequests.id });
      return updated ? { requestId, status: "declined" as const } : null;
    }

    if (request.status !== "submitted" &&
        request.status !== "under_review") return null;

    const scheduledAt = new Date(decision.scheduledAt);
    if (!Number.isFinite(scheduledAt.getTime()) ||
        scheduledAt.getTime() <= Date.now()) return null;

    const [session] = await tx.insert(problemSolvingSessions).values({
      requestId,
      courseId: assignment.courseId,
      studentUserId: request.studentUserId,
      supporterTeamMemberId: teamMemberId,
      subject: request.subject,
      scheduledAt,
      createdByUserId: memberUserId,
    }).onConflictDoNothing({
      target: problemSolvingSessions.requestId,
    }).returning({
      id: problemSolvingSessions.id,
      scheduledAt: problemSolvingSessions.scheduledAt,
    });

    if (!session) return null;

    await tx.update(problemSolvingRequests).set({
      status: "scheduled",
      updatedAt: new Date(),
    }).where(eq(problemSolvingRequests.id, requestId));

    return {
      requestId,
      status: "scheduled" as const,
      sessionId: session.id,
      scheduledAt: session.scheduledAt,
    };
  });
}

export async function decideSupporterSession(
  memberUserId: string,
  teamMemberId: string,
  sessionId: string,
  status: "held" | "cancelled",
) {
  const assignment = await activeSupporter(memberUserId, teamMemberId);
  if (!assignment) return null;

  const [session] = await getDb().select({
    id: problemSolvingSessions.id,
    studentUserId: problemSolvingSessions.studentUserId,
    status: problemSolvingSessions.status,
  }).from(problemSolvingSessions)
    .where(and(
      eq(problemSolvingSessions.id, sessionId),
      eq(problemSolvingSessions.courseId, assignment.courseId),
      eq(problemSolvingSessions.supporterTeamMemberId, teamMemberId),
    ))
    .limit(1);

  if (!session || session.status !== "scheduled" ||
      !await hasStudentEntitlement(
        session.studentUserId, assignment.courseId,
      )) return null;

  const [updated] = await getDb().update(problemSolvingSessions).set({
    status,
    updatedAt: new Date(),
  }).where(and(
    eq(problemSolvingSessions.id, sessionId),
    eq(problemSolvingSessions.status, "scheduled"),
  )).returning({
    id: problemSolvingSessions.id,
    status: problemSolvingSessions.status,
  });

  return updated ?? null;
}
