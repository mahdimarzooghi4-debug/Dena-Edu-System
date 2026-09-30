import { and, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courseConversationMessages,
  courseConversations,
  courseTeamMembers,
  user,
} from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";

const safeMessage = z.string().trim().min(1).max(4000).refine((value) =>
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
);
export const studentCourseMessageInput = z.object({
  body: safeMessage,
}).strict();

async function activeMember(courseId: string, teamMemberId: string) {
  const [member] = await getDb().select({
    teamMemberId: courseTeamMembers.id,
    memberUserId: courseTeamMembers.memberUserId,
    name: user.name,
    role: courseTeamMembers.role,
  }).from(courseTeamMembers)
    .innerJoin(user, eq(user.id, courseTeamMembers.memberUserId))
    .where(and(
      eq(courseTeamMembers.id, teamMemberId),
      eq(courseTeamMembers.courseId, courseId),
      eq(courseTeamMembers.status, "active"),
      inArray(courseTeamMembers.role, ["academic_supporter", "counselor"]),
    ))
    .limit(1);
  return member ?? null;
}

/**
 * Returns only the current student's conversation with one active member of
 * the same course team. Internal user IDs never leave this module.
 */
export async function getStudentCourseConversation(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  const member = await activeMember(courseId, teamMemberId);
  if (!member) return null;

  const [conversation] = await getDb().select({
    id: courseConversations.id,
  }).from(courseConversations).where(and(
    eq(courseConversations.courseId, courseId),
    eq(courseConversations.studentUserId, studentUserId),
    eq(courseConversations.teamMemberId, teamMemberId),
  )).limit(1);

  if (!conversation) {
    return {
      conversationId: null,
      member: {
        teamMemberId: member.teamMemberId,
        name: member.name,
        role: member.role,
      },
      messages: [],
    };
  }

  const rows = await getDb().select({
    id: courseConversationMessages.id,
    senderUserId: courseConversationMessages.senderUserId,
    body: courseConversationMessages.body,
    createdAt: courseConversationMessages.createdAt,
  }).from(courseConversationMessages)
    .where(and(
      eq(courseConversationMessages.conversationId, conversation.id),
      or(
        eq(courseConversationMessages.senderUserId, studentUserId),
        eq(courseConversationMessages.senderUserId, member.memberUserId),
      ),
    ))
    .orderBy(desc(courseConversationMessages.createdAt))
    .limit(100);

  return {
    conversationId: conversation.id,
    member: {
      teamMemberId: member.teamMemberId,
      name: member.name,
      role: member.role,
    },
    messages: rows.reverse().map((row) => ({
      id: row.id,
      sender: row.senderUserId === studentUserId
        ? "student" as const
        : "team_member" as const,
      body: row.body,
      createdAt: row.createdAt,
    })),
  };
}

export async function sendStudentCourseMessage(
  studentUserId: string,
  courseId: string,
  teamMemberId: string,
  body: string,
) {
  if (!await hasStudentEntitlement(studentUserId, courseId)) return null;
  const member = await activeMember(courseId, teamMemberId);
  if (!member) return null;

  return getDb().transaction(async (tx) => {
    const [createdConversation] = await tx.insert(courseConversations).values({
      courseId,
      studentUserId,
      teamMemberId,
    }).onConflictDoNothing({
      target: [courseConversations.studentUserId, courseConversations.teamMemberId],
    }).returning({ id: courseConversations.id });

    const conversation = createdConversation ?? (
      await tx.select({ id: courseConversations.id })
        .from(courseConversations)
        .where(and(
          eq(courseConversations.courseId, courseId),
          eq(courseConversations.studentUserId, studentUserId),
          eq(courseConversations.teamMemberId, teamMemberId),
        ))
        .limit(1)
    )[0];

    if (!conversation) throw new Error("conversation_conflict");

    const [message] = await tx.insert(courseConversationMessages).values({
      conversationId: conversation.id,
      senderUserId: studentUserId,
      body,
    }).returning({
      id: courseConversationMessages.id,
      body: courseConversationMessages.body,
      createdAt: courseConversationMessages.createdAt,
    });

    if (!message) throw new Error("message_insert_failed");

    await tx.update(courseConversations).set({
      lastMessageAt: message.createdAt,
    }).where(eq(courseConversations.id, conversation.id));

    return {
      conversationId: conversation.id,
      message: {
        id: message.id,
        sender: "student" as const,
        body: message.body,
        createdAt: message.createdAt,
      },
    };
  });
}
