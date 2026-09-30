import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseConversationMessages,
  courseConversations,
  courseTeamMembers,
  courses,
  studentEnrollments,
  user,
} from "../../db/schema";

const safeMessage = z.string().trim().min(1).max(4000).refine((value) =>
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
);
export const courseTeamReplyInput = z.object({ body: safeMessage }).strict();

async function activeAssignment(memberUserId: string, teamMemberId: string) {
  const [assignment] = await getDb().select({
    teamMemberId: courseTeamMembers.id,
    courseId: courseTeamMembers.courseId,
    role: courseTeamMembers.role,
    courseTitle: courses.title,
  }).from(courseTeamMembers)
    .innerJoin(courses, eq(courses.id, courseTeamMembers.courseId))
    .where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.memberUserId, memberUserId),
      eq(courseTeamMembers.status, "active"),
    ))
    .limit(1);
  return assignment ?? null;
}

export async function getActiveCourseTeamAssignments(memberUserId: string) {
  return getDb().select({
    teamMemberId: courseTeamMembers.id,
    courseId: courseTeamMembers.courseId,
    courseTitle: courses.title,
    role: courseTeamMembers.role,
  }).from(courseTeamMembers)
    .innerJoin(courses, eq(courses.id, courseTeamMembers.courseId))
    .where(and(
      eq(courseTeamMembers.memberUserId, memberUserId),
      eq(courseTeamMembers.status, "active"),
    ));
}

/**
 * Inbox is limited to active assignments owned by the current user.
 * Student identity is shown only for students who started a conversation in
 * that assigned course. No contact/auth/private-note data is selected.
 */
export async function getCourseTeamInbox(memberUserId: string) {
  const assignments = await getActiveCourseTeamAssignments(memberUserId);

  if (assignments.length === 0) return [];

  const assignmentIds = assignments.map((item) => item.teamMemberId);
  const rows = await getDb().select({
    conversationId: courseConversations.id,
    teamMemberId: courseConversations.teamMemberId,
    courseId: courseConversations.courseId,
    studentUserId: courseConversations.studentUserId,
    studentName: user.name,
    lastMessageAt: courseConversations.lastMessageAt,
  }).from(courseConversations)
    .innerJoin(user, eq(user.id, courseConversations.studentUserId))
    .innerJoin(studentEnrollments, and(
      eq(studentEnrollments.studentUserId, courseConversations.studentUserId),
      eq(studentEnrollments.courseId, courseConversations.courseId),
      eq(studentEnrollments.status, "active"),
    ))
    .where(inArray(courseConversations.teamMemberId, assignmentIds))
    .orderBy(desc(courseConversations.lastMessageAt))
    .limit(100);

  const assignmentMap = new Map(assignments.map((item) => [
    item.teamMemberId,
    item,
  ] as const));

  return rows.flatMap((row) => {
    const assignment = assignmentMap.get(row.teamMemberId);
    if (!assignment || assignment.courseId !== row.courseId) return [];
    return [{
      conversationId: row.conversationId,
      teamMemberId: row.teamMemberId,
      courseId: row.courseId,
      courseTitle: assignment.courseTitle,
      role: assignment.role,
      studentName: row.studentName,
      lastMessageAt: row.lastMessageAt,
    }];
  });
}

export async function getCourseTeamConversation(
  memberUserId: string,
  teamMemberId: string,
  conversationId: string,
) {
  const assignment = await activeAssignment(memberUserId, teamMemberId);
  if (!assignment) return null;

  const [conversation] = await getDb().select({
    id: courseConversations.id,
    studentUserId: courseConversations.studentUserId,
    studentName: user.name,
  }).from(courseConversations)
    .innerJoin(user, eq(user.id, courseConversations.studentUserId))
    .innerJoin(studentEnrollments, and(
      eq(studentEnrollments.studentUserId, courseConversations.studentUserId),
      eq(studentEnrollments.courseId, courseConversations.courseId),
      eq(studentEnrollments.status, "active"),
    ))
    .where(and(
      eq(courseConversations.id, conversationId),
      eq(courseConversations.teamMemberId, teamMemberId),
      eq(courseConversations.courseId, assignment.courseId),
    ))
    .limit(1);

  if (!conversation) return null;

  const messages = await getDb().select({
    id: courseConversationMessages.id,
    senderUserId: courseConversationMessages.senderUserId,
    body: courseConversationMessages.body,
    createdAt: courseConversationMessages.createdAt,
  }).from(courseConversationMessages)
    .where(eq(courseConversationMessages.conversationId, conversationId))
    .orderBy(courseConversationMessages.createdAt)
    .limit(100);

  return {
    conversationId,
    assignment: {
      teamMemberId,
      courseId: assignment.courseId,
      courseTitle: assignment.courseTitle,
      role: assignment.role,
    },
    student: { name: conversation.studentName },
    messages: messages.flatMap((message) => {
      if (message.senderUserId === memberUserId) {
        return [{
          id: message.id,
          sender: "team_member" as const,
          body: message.body,
          createdAt: message.createdAt,
        }];
      }
      if (message.senderUserId === conversation.studentUserId) {
        return [{
          id: message.id,
          sender: "student" as const,
          body: message.body,
          createdAt: message.createdAt,
        }];
      }
      return [];
    }),
  };
}

export async function sendCourseTeamReply(
  memberUserId: string,
  teamMemberId: string,
  conversationId: string,
  body: string,
) {
  const assignment = await activeAssignment(memberUserId, teamMemberId);
  if (!assignment) return null;

  return getDb().transaction(async (tx) => {
    const [conversation] = await tx.select({
      id: courseConversations.id,
      studentUserId: courseConversations.studentUserId,
    }).from(courseConversations)
      .innerJoin(studentEnrollments, and(
        eq(studentEnrollments.studentUserId, courseConversations.studentUserId),
        eq(studentEnrollments.courseId, courseConversations.courseId),
        eq(studentEnrollments.status, "active"),
      ))
      .where(and(
        eq(courseConversations.id, conversationId),
        eq(courseConversations.teamMemberId, teamMemberId),
        eq(courseConversations.courseId, assignment.courseId),
      ))
      .limit(1)
      .for("update");

    if (!conversation) return null;

    const [message] = await tx.insert(courseConversationMessages).values({
      conversationId,
      senderUserId: memberUserId,
      body,
    }).returning({
      id: courseConversationMessages.id,
      body: courseConversationMessages.body,
      createdAt: courseConversationMessages.createdAt,
    });

    if (!message) throw new Error("course_team_message_insert_failed");

    await tx.update(courseConversations).set({
      lastMessageAt: message.createdAt,
    }).where(eq(courseConversations.id, conversationId));

    return {
      conversationId,
      message: {
        id: message.id,
        sender: "team_member" as const,
        body: message.body,
        createdAt: message.createdAt,
      },
    };
  });
}
