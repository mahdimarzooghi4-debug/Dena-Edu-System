import { and, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  instituteServiceOrders, memberships, serviceOrderMessages, user, verifiedEntities,
} from "../../db/schema";

export const sendServiceOrderMessageInput = z.object({
  body: z.string().trim().min(1).max(4000),
  idempotencyKey: z.uuid(),
}).strict();

export class ServiceOrderMessageError extends Error {
  constructor(readonly kind: "conversation_unavailable" | "rate_limited" | "idempotency_conflict") { super(kind); }
}

export async function requireServiceOrderParticipant(
  tx: Pick<ReturnType<typeof getDb>, "select">, userId: string, orderId: string,
) {
  const [order] = await tx.select({
    id: instituteServiceOrders.id,
    serviceTitleSnapshot: instituteServiceOrders.serviceTitleSnapshot,
    studentUserId: instituteServiceOrders.studentUserId,
    instituteId: instituteServiceOrders.instituteId,
    status: instituteServiceOrders.status,
    guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
    guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
  }).from(instituteServiceOrders).where(eq(instituteServiceOrders.id, orderId)).limit(1).for("share");
  if (!order || order.status !== "paid" ||
      (order.guardianConsentRequired && !order.guardianConsentConfirmedAt)) return null;

  if (order.studentUserId === userId) {
    const [student] = await tx.select({ id: memberships.id }).from(memberships).where(and(
      eq(memberships.userId, userId), eq(memberships.role, "student"), eq(memberships.status, "active"),
    )).limit(1).for("share");
    return student ? { order, role: "student" as const } : null;
  }

  const [institute] = await tx.select({ id: memberships.id }).from(memberships)
    .innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, memberships.instituteId), eq(verifiedEntities.role, "institute"),
    )).where(and(
      eq(memberships.userId, userId), eq(memberships.role, "institute"),
      eq(memberships.instituteId, order.instituteId), eq(memberships.status, "active"),
    )).limit(1).for("share");
  return institute ? { order, role: "institute" as const } : null;
}

export async function getServiceOrderConversation(userId: string, orderId: string) {
  return getDb().transaction(async (tx) => {
    const participant = await requireServiceOrderParticipant(tx, userId, orderId);
    if (!participant) return null;
    const rows = await tx.select({
      id: serviceOrderMessages.id,
      senderUserId: serviceOrderMessages.senderUserId,
      senderName: user.name,
      body: serviceOrderMessages.body,
      createdAt: serviceOrderMessages.createdAt,
    }).from(serviceOrderMessages).innerJoin(user, eq(user.id, serviceOrderMessages.senderUserId))
      .where(eq(serviceOrderMessages.serviceOrderId, orderId))
      .orderBy(desc(serviceOrderMessages.createdAt), desc(serviceOrderMessages.id)).limit(100);
    return {
      role: participant.role,
      orderTitle: participant.order.serviceTitleSnapshot,
      messages: rows.reverse().map((message) => ({
        ...message,
        senderRole: message.senderUserId === participant.order.studentUserId ? "student" as const : "institute" as const,
      })),
    };
  });
}

export async function sendServiceOrderMessage(
  userId: string, orderId: string, input: z.infer<typeof sendServiceOrderMessageInput>,
) {
  const parsed = sendServiceOrderMessageInput.parse(input);
  return getDb().transaction(async (tx) => {
    // Serialize sends per order, including retries and rate-limit checks.
    // This prevents two concurrent requests from bypassing the 20/minute cap.
    const [lockedOrder] = await tx.select({ id: instituteServiceOrders.id })
      .from(instituteServiceOrders).where(eq(instituteServiceOrders.id, orderId))
      .limit(1).for("update");
    if (!lockedOrder) throw new ServiceOrderMessageError("conversation_unavailable");
    const participant = await requireServiceOrderParticipant(tx, userId, orderId);
    if (!participant) throw new ServiceOrderMessageError("conversation_unavailable");
    const [existing] = await tx.select({
      id: serviceOrderMessages.id,
      senderUserId: serviceOrderMessages.senderUserId,
      body: serviceOrderMessages.body,
      createdAt: serviceOrderMessages.createdAt,
    }).from(serviceOrderMessages).where(and(
      eq(serviceOrderMessages.serviceOrderId, orderId),
      eq(serviceOrderMessages.senderUserId, userId),
      eq(serviceOrderMessages.idempotencyKey, parsed.idempotencyKey),
    )).limit(1);
    if (existing) {
      if (existing.body !== parsed.body) {
        throw new ServiceOrderMessageError("idempotency_conflict");
      }
      return { ...existing, duplicate: true };
    }

    const recent = await tx.select({ count: sql<number>`count(*)::int` })
      .from(serviceOrderMessages).where(and(
        eq(serviceOrderMessages.serviceOrderId, orderId),
        eq(serviceOrderMessages.senderUserId, userId),
        gt(serviceOrderMessages.createdAt, new Date(Date.now() - 60_000)),
      ));
    if ((recent[0]?.count ?? 0) >= 20) throw new ServiceOrderMessageError("rate_limited");

    const [message] = await tx.insert(serviceOrderMessages).values({
      serviceOrderId: orderId,
      senderUserId: userId,
      idempotencyKey: parsed.idempotencyKey,
      body: parsed.body,
    }).returning({
      id: serviceOrderMessages.id,
      senderUserId: serviceOrderMessages.senderUserId,
      body: serviceOrderMessages.body,
      createdAt: serviceOrderMessages.createdAt,
    });
    return { ...message!, duplicate: false };
  });
}
