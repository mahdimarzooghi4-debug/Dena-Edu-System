import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  auditLogs, instituteServiceCalls, instituteServiceOrders, memberships,
  serviceCallFollowUps, serviceTimeLedger, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import type { FinancialJournalTransaction } from "../finance/ledger";
import { closeLiveKitRoom } from "./livekit";

export const scheduleInstituteServiceCallInput = z.object({
  scheduledAt: z.iso.datetime({ offset: true }),
  idempotencyKey: z.uuid(),
}).strict();
export const publishInstituteServiceCallFollowUpInput = z.object({
  summary: z.string().trim().min(10).max(4_000),
  nextSteps: z.array(z.string().trim().min(1).max(300)).max(10),
}).strict();

export class InstituteServiceCallError extends Error {
  constructor(readonly kind:
    "institute_unavailable" | "call_unavailable" | "order_unavailable" |
    "service_not_ready" | "quota_empty" | "call_too_early" | "idempotency_conflict" |
    "media_shutdown_failed") { super(kind); }
}

export class StudentServiceCallError extends Error {
  constructor(readonly kind: "student_unavailable" | "call_unavailable" | "media_shutdown_failed") {
    super(kind);
  }
}

/** Rechecks all paid-service, consent, quota, time-limit and participant rules
 * immediately before issuing a one-hour LiveKit room token. */
export async function requireServiceCallJoinAccess(userId: string, callId: string) {
  const db = getDb();
  const [context] = await db.select({
    id: instituteServiceCalls.id,
    status: instituteServiceCalls.status,
    connectedSeconds: instituteServiceCalls.connectedSeconds,
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
    seconds: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.seconds} else -${serviceTimeLedger.seconds} end), 0)::int`,
  }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, context.serviceOrderId));
  if ((balance?.seconds ?? 0) <= context.connectedSeconds) {
    throw new InstituteServiceCallError("quota_empty");
  }
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
  const followUps = await getDb().select({
    serviceCallId: serviceCallFollowUps.serviceCallId,
    summary: serviceCallFollowUps.summary,
    nextSteps: serviceCallFollowUps.nextSteps,
    publishedAt: serviceCallFollowUps.publishedAt,
  }).from(serviceCallFollowUps).where(inArray(
    serviceCallFollowUps.serviceCallId, calls.map((call) => call.id),
  ));
  const followUpByCall = new Map(followUps.map((item) => [item.serviceCallId, {
    summary: item.summary, nextSteps: item.nextSteps, publishedAt: item.publishedAt,
  }]));
  const byOrder = new Map<string, typeof calls>();
  for (const call of calls) byOrder.set(call.serviceOrderId, [
    ...(byOrder.get(call.serviceOrderId) ?? []), call,
  ]);
  return orders.map((order) => ({
    ...order,
    calls: (byOrder.get(order.id) ?? []).map((call) => ({
      ...call, followUp: followUpByCall.get(call.id) ?? null,
    })),
  }));
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

/** Publishes only an intentional student-visible summary and next steps.
 * Private counselor notes and recordings have no field in this model. */
export async function publishInstituteServiceCallFollowUp(
  userId: string,
  callId: string,
  input: z.infer<typeof publishInstituteServiceCallFollowUpInput>,
) {
  const parsed = publishInstituteServiceCallFollowUpInput.parse(input);
  return getDb().transaction(async (tx) => {
    const instituteIds = await getInstituteIds(tx, userId);
    if (!instituteIds.length) throw new InstituteServiceCallError("institute_unavailable");
    const [reference] = await tx.select({
      id: instituteServiceCalls.id,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, callId)).limit(1);
    if (!reference) throw new InstituteServiceCallError("call_unavailable");
    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      status: instituteServiceOrders.status,
      guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
      guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
    }).from(instituteServiceOrders).where(and(
      eq(instituteServiceOrders.id, reference.serviceOrderId),
      inArray(instituteServiceOrders.instituteId, instituteIds),
    )).limit(1).for("update");
    const [call] = await tx.select({
      id: instituteServiceCalls.id,
      status: instituteServiceCalls.status,
      endedAt: instituteServiceCalls.endedAt,
    }).from(instituteServiceCalls).where(and(
      eq(instituteServiceCalls.id, reference.id),
      eq(instituteServiceCalls.serviceOrderId, reference.serviceOrderId),
    )).limit(1).for("update");
    if (!order || !call) throw new InstituteServiceCallError("call_unavailable");
    if (order.status !== "paid" ||
        (order.guardianConsentRequired && !order.guardianConsentConfirmedAt) ||
        call.status !== "ended" || !call.endedAt) {
      throw new InstituteServiceCallError("service_not_ready");
    }
    const now = new Date();
    const [followUp] = await tx.insert(serviceCallFollowUps).values({
      serviceCallId: call.id,
      authorUserId: userId,
      summary: parsed.summary,
      nextSteps: parsed.nextSteps,
      publishedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: serviceCallFollowUps.serviceCallId,
      set: {
        authorUserId: userId,
        summary: parsed.summary,
        nextSteps: parsed.nextSteps,
        publishedAt: now,
        updatedAt: now,
      },
    }).returning({
      serviceCallId: serviceCallFollowUps.serviceCallId,
      summary: serviceCallFollowUps.summary,
      nextSteps: serviceCallFollowUps.nextSteps,
      publishedAt: serviceCallFollowUps.publishedAt,
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId,
      actorRole: "institute",
      action: "institute.service_call.follow_up.published",
      entityType: "SERVICE_CALL",
      entityId: call.id,
    }));
    return { ...followUp!, duplicate: false };
  });
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
    seconds: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.seconds} else -${serviceTimeLedger.seconds} end), 0)::int`,
  }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, order.id));
  if ((balance?.seconds ?? 0) <= 0) throw new InstituteServiceCallError("quota_empty");
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

/** Lets the booked student end their own started session. Ending is idempotent;
 * retries also repair a transient LiveKit room-close failure. */
export async function endStudentServiceCall(userId: string, callId: string, now = new Date()) {
  const result = await getDb().transaction(async (tx) => {
    const [student] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "student"),
        eq(memberships.status, "active"))).limit(1);
    if (!student) throw new StudentServiceCallError("student_unavailable");

    const [reference] = await tx.select({
      id: instituteServiceCalls.id,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, callId)).limit(1);
    if (!reference) throw new StudentServiceCallError("call_unavailable");
    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      studentUserId: instituteServiceOrders.studentUserId,
      status: instituteServiceOrders.status,
      guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
      guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
    }).from(instituteServiceOrders).where(and(
      eq(instituteServiceOrders.id, reference.serviceOrderId),
      eq(instituteServiceOrders.studentUserId, userId),
    )).limit(1).for("update");
    const [call] = await tx.select({
      id: instituteServiceCalls.id,
      status: instituteServiceCalls.status,
      startedAt: instituteServiceCalls.startedAt,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, reference.id))
      .limit(1).for("update");
    if (!order || !call || order.studentUserId !== userId || order.status !== "paid" ||
        (order.guardianConsentRequired && !order.guardianConsentConfirmedAt)) {
      throw new StudentServiceCallError("call_unavailable");
    }
    if (call.status === "ended") return { id: call.id, status: call.status, duplicate: true };
    if (call.status !== "started" || !call.startedAt || now.getTime() < call.startedAt.getTime()) {
      throw new StudentServiceCallError("call_unavailable");
    }
    await tx.update(instituteServiceCalls).set({
      status: "ended", endedAt: now, updatedAt: now,
    }).where(eq(instituteServiceCalls.id, call.id));
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "student", action: "student.service_call.ended",
      entityType: "SERVICE_CALL", entityId: call.id,
    }));
    return { id: call.id, status: "ended" as const, duplicate: false };
  });
  if (process.env.DENA_LIVEKIT_ENABLED === "1" &&
      process.env.DENA_LIVEKIT_ROOM_CONTROL_ENABLED !== "0") {
    try {
      await closeLiveKitRoom(callId);
    } catch {
      throw new StudentServiceCallError("media_shutdown_failed");
    }
  }
  return result;
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
