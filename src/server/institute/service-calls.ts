import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  auditLogs, instituteServiceCalls, instituteServiceOrders, memberships,
  serviceTimeLedger, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import type { FinancialJournalTransaction } from "../finance/ledger";
import { closeLiveKitRoom } from "./livekit";

export const scheduleInstituteServiceCallInput = z.object({
  scheduledAt: z.iso.datetime({ offset: true }),
  idempotencyKey: z.uuid(),
}).strict();

export class InstituteServiceCallError extends Error {
  constructor(readonly kind:
    "institute_unavailable" | "call_unavailable" | "order_unavailable" |
    "service_not_ready" | "quota_empty" | "call_too_early" | "idempotency_conflict" |
    "media_shutdown_failed") { super(kind); }
}

/** Rechecks all paid-service, consent, quota, time-limit and participant rules
 * immediately before issuing a one-hour LiveKit room token. */
export async function requireServiceCallJoinAccess(userId: string, callId: string) {
  const db = getDb();
  const [context] = await db.select({
    id: instituteServiceCalls.id,
    status: instituteServiceCalls.status,
    serviceOrderId: instituteServiceOrders.id,
    studentUserId: instituteServiceOrders.studentUserId,
    instituteId: instituteServiceOrders.instituteId,
    paidAt: instituteServiceOrders.paidAt,
    validityDays: instituteServiceOrders.validityDays,
    includedMinutes: instituteServiceOrders.includedMinutes,
    orderStatus: instituteServiceOrders.status,
    guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
    guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
  }).from(instituteServiceCalls).innerJoin(instituteServiceOrders, eq(
    instituteServiceOrders.id, instituteServiceCalls.serviceOrderId,
  )).where(eq(instituteServiceCalls.id, callId)).limit(1);
  if (!context || context.status !== "started" || context.orderStatus !== "paid" ||
      !context.paidAt || context.includedMinutes === null ||
      (context.guardianConsentRequired && !context.guardianConsentConfirmedAt)) {
    throw new InstituteServiceCallError("call_unavailable");
  }
  if (context.validityDays !== null && Date.now() >
      context.paidAt.getTime() + context.validityDays * 24 * 60 * 60 * 1000) {
    throw new InstituteServiceCallError("service_not_ready");
  }
  const [instituteMember] = await db.select({ id: memberships.id })
    .from(memberships).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, memberships.instituteId),
      eq(verifiedEntities.role, "institute"),
    )).where(and(
      eq(memberships.userId, userId), eq(memberships.role, "institute"),
      eq(memberships.instituteId, context.instituteId), eq(memberships.status, "active"),
    )).limit(1);
  const [studentMember] = await db.select({ id: memberships.id })
    .from(memberships).where(and(
      eq(memberships.userId, userId), eq(memberships.role, "student"),
      eq(memberships.status, "active"),
    )).limit(1);
  if (context.studentUserId !== userId || !studentMember) {
    if (!instituteMember) throw new InstituteServiceCallError("call_unavailable");
  }
  const [balance] = await db.select({
    minutes: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.minutes} else -${serviceTimeLedger.minutes} end), 0)::int`,
  }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, context.serviceOrderId));
  if ((balance?.minutes ?? 0) <= 0) throw new InstituteServiceCallError("quota_empty");
  return { callId: context.id };
}

export async function addInstituteServiceCallSchedules<T extends { id: string }>(orders: T[]) {
  if (!orders.length) return orders.map((order) => ({ ...order, calls: [] }));
  const calls = await getDb().select({
    id: instituteServiceCalls.id,
    serviceOrderId: instituteServiceCalls.serviceOrderId,
    scheduledAt: instituteServiceCalls.scheduledAt,
    status: instituteServiceCalls.status,
  }).from(instituteServiceCalls).where(inArray(
    instituteServiceCalls.serviceOrderId, orders.map((order) => order.id),
  )).orderBy(asc(instituteServiceCalls.scheduledAt), asc(instituteServiceCalls.id));
  const byOrder = new Map<string, typeof calls>();
  for (const call of calls) byOrder.set(call.serviceOrderId, [
    ...(byOrder.get(call.serviceOrderId) ?? []), call,
  ]);
  return orders.map((order) => ({ ...order, calls: byOrder.get(order.id) ?? [] }));
}

async function getInstituteIds(tx: FinancialJournalTransaction, userId: string) {
  const rows = await tx.select({ instituteId: memberships.instituteId })
    .from(memberships).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, memberships.instituteId), eq(verifiedEntities.role, "institute"),
    )).where(and(
      eq(memberships.userId, userId), eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
    ));
  return rows.flatMap((row) => row.instituteId ? [row.instituteId] : []);
}

async function requireUsablePaidOrder(tx: FinancialJournalTransaction, orderId: string, instituteIds: string[]) {
  const [order] = await tx.select({
    id: instituteServiceOrders.id,
    includedMinutes: instituteServiceOrders.includedMinutes,
    status: instituteServiceOrders.status,
    guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
    guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
  }).from(instituteServiceOrders).where(and(
    eq(instituteServiceOrders.id, orderId), inArray(instituteServiceOrders.instituteId, instituteIds),
  )).limit(1).for("update");
  if (!order) throw new InstituteServiceCallError("order_unavailable");
  if (order.status !== "paid" || (order.guardianConsentRequired && !order.guardianConsentConfirmedAt)) {
    throw new InstituteServiceCallError("service_not_ready");
  }
  if (order.includedMinutes === null) throw new InstituteServiceCallError("service_not_ready");
  const [balance] = await tx.select({
    minutes: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.minutes} else -${serviceTimeLedger.minutes} end), 0)::int`,
  }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, order.id));
  if ((balance?.minutes ?? 0) <= 0) throw new InstituteServiceCallError("quota_empty");
  return order;
}

/** Creates appointment metadata only. It does not issue a room token or connect to media. */
export async function scheduleInstituteServiceCall(
  userId: string, orderId: string, input: z.infer<typeof scheduleInstituteServiceCallInput>,
) {
  const parsed = scheduleInstituteServiceCallInput.parse(input);
  const { scheduledAt } = parsed;
  const at = new Date(scheduledAt);
  if (at.getTime() <= Date.now()) throw new InstituteServiceCallError("call_unavailable");
  return getDb().transaction(async (tx) => {
    const instituteIds = await getInstituteIds(tx, userId);
    if (!instituteIds.length) throw new InstituteServiceCallError("institute_unavailable");
    const order = await requireUsablePaidOrder(tx, orderId, instituteIds);
    const [existing] = await tx.select({
      id: instituteServiceCalls.id,
      scheduledAt: instituteServiceCalls.scheduledAt,
      status: instituteServiceCalls.status,
    }).from(instituteServiceCalls).where(and(
      eq(instituteServiceCalls.serviceOrderId, order.id),
      eq(instituteServiceCalls.idempotencyKey, parsed.idempotencyKey),
    )).limit(1).for("update");
    if (existing) {
      if (existing.scheduledAt.getTime() !== at.getTime()) {
        throw new InstituteServiceCallError("idempotency_conflict");
      }
      return { id: existing.id, status: existing.status, scheduledAt: at, duplicate: true };
    }
    const [openCall] = await tx.select({ id: instituteServiceCalls.id })
      .from(instituteServiceCalls).where(and(
        eq(instituteServiceCalls.serviceOrderId, order.id),
        inArray(instituteServiceCalls.status, ["scheduled", "started"]),
      )).limit(1).for("update");
    if (openCall) throw new InstituteServiceCallError("call_unavailable");
    const [call] = await tx.insert(instituteServiceCalls).values({
      serviceOrderId: order.id, idempotencyKey: parsed.idempotencyKey,
      scheduledAt: at, createdByUserId: userId,
    }).returning({ id: instituteServiceCalls.id, status: instituteServiceCalls.status });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "institute", action: "institute.service_call.scheduled",
      entityType: "SERVICE_CALL", entityId: call!.id,
    }));
    return { ...call!, scheduledAt: at, duplicate: false };
  });
}

export async function startInstituteServiceCall(userId: string, callId: string, now = new Date()) {
  return transitionInstituteServiceCall(userId, callId, "start", now);
}

export async function endInstituteServiceCall(userId: string, callId: string, now = new Date()) {
  return transitionInstituteServiceCall(userId, callId, "end", now);
}

export async function cancelInstituteServiceCall(userId: string, callId: string, now = new Date()) {
  return transitionInstituteServiceCall(userId, callId, "cancel", now);
}

async function transitionInstituteServiceCall(
  userId: string, callId: string, action: "start" | "end" | "cancel", now: Date,
) {
  const result = await getDb().transaction(async (tx) => {
    const instituteIds = await getInstituteIds(tx, userId);
    if (!instituteIds.length) throw new InstituteServiceCallError("institute_unavailable");
    const [callReference] = await tx.select({
      id: instituteServiceCalls.id,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, callId)).limit(1);
    if (!callReference) throw new InstituteServiceCallError("call_unavailable");
    const [ownedOrder] = await tx.select({ id: instituteServiceOrders.id })
      .from(instituteServiceOrders).where(and(
        eq(instituteServiceOrders.id, callReference.serviceOrderId),
        inArray(instituteServiceOrders.instituteId, instituteIds),
      )).limit(1).for("update");
    if (!ownedOrder) throw new InstituteServiceCallError("call_unavailable");
    const [call] = await tx.select({
      id: instituteServiceCalls.id,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
      scheduledAt: instituteServiceCalls.scheduledAt,
      status: instituteServiceCalls.status,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, callId)).limit(1).for("update");
    if (!call) throw new InstituteServiceCallError("call_unavailable");
    if (action === "start") {
      await requireUsablePaidOrder(tx, call.serviceOrderId, instituteIds);
      if (call.status === "started") return { id: call.id, status: call.status, duplicate: true };
      if (call.status !== "scheduled") throw new InstituteServiceCallError("call_unavailable");
      if (now.getTime() < call.scheduledAt.getTime()) throw new InstituteServiceCallError("call_too_early");
    } else if (action === "end") {
      if (call.status === "ended") return { id: call.id, status: call.status, duplicate: true };
      if (call.status !== "started") throw new InstituteServiceCallError("call_unavailable");
      const [started] = await tx.select({ startedAt: instituteServiceCalls.startedAt })
        .from(instituteServiceCalls).where(eq(instituteServiceCalls.id, call.id)).limit(1);
      if (!started?.startedAt || now.getTime() < started.startedAt.getTime()) {
        throw new InstituteServiceCallError("call_unavailable");
      }
    } else {
      if (call.status === "cancelled") return { id: call.id, status: call.status, duplicate: true };
      if (call.status !== "scheduled") throw new InstituteServiceCallError("call_unavailable");
    }
    const status = action === "start" ? "started" as const : action === "end" ? "ended" as const : "cancelled" as const;
    await tx.update(instituteServiceCalls).set({
      status,
      ...(action === "start" ? { startedAt: now } : {}),
      ...(action === "end" ? { endedAt: now } : {}),
      updatedAt: now,
    }).where(eq(instituteServiceCalls.id, call.id));
    const actionName = action === "start" ? "started" : action === "end" ? "ended" : "cancelled";
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "institute", action: `institute.service_call.${actionName}`,
      entityType: "SERVICE_CALL", entityId: call.id,
    }));
    return { id: call.id, status, duplicate: false };
  });
  // CI enables token issuance with a fake WSS URL, but intentionally does not
  // enable Room Service control. Production preflight requires this flag on.
  if (action === "end" && process.env.DENA_LIVEKIT_ENABLED === "1" &&
      process.env.DENA_LIVEKIT_ROOM_CONTROL_ENABLED !== "0") {
    try {
      // Repeat this even for an already-ended call so a transient media server
      // failure can be repaired by retrying the same end action.
      await closeLiveKitRoom(callId);
    } catch {
      throw new InstituteServiceCallError("media_shutdown_failed");
    }
  }
  return result;
}
