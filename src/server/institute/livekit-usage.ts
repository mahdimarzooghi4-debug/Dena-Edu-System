import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  instituteServiceCalls, instituteServiceOrders, memberships, serviceCallMediaEvents,
  serviceTimeLedger, verifiedEntities,
} from "../../db/schema";
import type { FinancialJournalTransaction } from "../finance/ledger";
import { closeLiveKitRoom } from "./livekit";

export type PresenceEvent = {
  id: string;
  participantRole: "student" | "institute" | "system";
  participantUserId: string | null;
  kind: "joined" | "left" | "room_finished";
  occurredAt: Date;
};

/** Sums only intervals during which the student and at least one institute
 * member are present together. LiveKit timestamps have whole-second precision. */
export function calculateConnectedOverlapSeconds(events: PresenceEvent[]) {
  return calculatePresenceSummary(events).connectedSeconds;
}

export function calculatePresenceSummary(events: PresenceEvent[]) {
  const timeline = [...events].sort((a, b) =>
    a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id));
  let studentConnected = false;
  const instituteParticipants = new Set<string>();
  let previousAt: number | undefined;
  let seconds = 0;
  for (const event of timeline) {
    const at = event.occurredAt.getTime();
    if (previousAt !== undefined && studentConnected && instituteParticipants.size > 0) {
      seconds += Math.max(0, (at - previousAt) / 1000);
    }
    if (event.kind === "room_finished") {
      return { connectedSeconds: seconds, activeOverlap: false, lastEventAt: event.occurredAt };
    }
    if (event.participantUserId) {
      if (event.participantRole === "student") studentConnected = event.kind === "joined";
      if (event.participantRole === "institute") {
        if (event.kind === "joined") instituteParticipants.add(event.participantUserId);
        else instituteParticipants.delete(event.participantUserId);
      }
    }
    previousAt = at;
  }
  return {
    connectedSeconds: seconds,
    activeOverlap: studentConnected && instituteParticipants.size > 0,
    lastEventAt: timeline.at(-1)?.occurredAt ?? null,
  };
}

export class LiveKitUsageEventError extends Error {
  constructor(readonly kind:
    "call_unavailable" | "participant_unverified" | "event_reused" | "event_invalid") {
    super(kind);
  }
}

export async function recordLiveKitPresenceEvent(input: {
  eventId: string;
  callId: string;
  identity: string | null;
  kind: "joined" | "left" | "room_finished";
  occurredAt: Date;
}) {
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(input.eventId) ||
      !/^[0-9a-f-]{36}$/i.test(input.callId) || !Number.isFinite(input.occurredAt.getTime()) ||
      input.occurredAt.getTime() % 1000 !== 0 ||
      (input.kind === "room_finished" ? input.identity !== null :
        !input.identity || !/^[0-9a-f-]{36}$/i.test(input.identity))) {
    throw new LiveKitUsageEventError("event_invalid");
  }

  const result = await getDb().transaction(async (tx) => {
    const [callReference] = await tx.select({
      id: instituteServiceCalls.id,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, input.callId))
      .limit(1);
    if (!callReference) throw new LiveKitUsageEventError("call_unavailable");
    // Keep the established order → call lock order used by lifecycle and quota writes.
    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      studentUserId: instituteServiceOrders.studentUserId,
      instituteId: instituteServiceOrders.instituteId,
      status: instituteServiceOrders.status,
      guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
      guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
    }).from(instituteServiceOrders).where(eq(
      instituteServiceOrders.id, callReference.serviceOrderId,
    )).limit(1).for("update");
    const [call] = await tx.select({
      id: instituteServiceCalls.id,
      status: instituteServiceCalls.status,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
    }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, callReference.id))
      .limit(1).for("update");
    if (!order || !call || !["started", "ended"].includes(call.status) ||
        order.status !== "paid" ||
        (order.guardianConsentRequired && !order.guardianConsentConfirmedAt)) {
      throw new LiveKitUsageEventError("call_unavailable");
    }

    const [duplicate] = await tx.select({
      serviceCallId: serviceCallMediaEvents.serviceCallId,
      kind: serviceCallMediaEvents.kind,
      participantUserId: serviceCallMediaEvents.participantUserId,
      occurredAt: serviceCallMediaEvents.occurredAt,
    }).from(serviceCallMediaEvents).where(eq(
      serviceCallMediaEvents.providerEventId, input.eventId,
    )).limit(1);
    if (duplicate) {
      if (duplicate.serviceCallId !== call.id || duplicate.kind !== input.kind ||
          duplicate.participantUserId !== input.identity ||
          duplicate.occurredAt.getTime() !== input.occurredAt.getTime()) {
        throw new LiveKitUsageEventError("event_reused");
      }
      const [current] = await tx.select({
        connectedSeconds: instituteServiceCalls.connectedSeconds,
      }).from(instituteServiceCalls).where(eq(instituteServiceCalls.id, call.id)).limit(1);
      const remainingSeconds = await remainingServiceSeconds(tx, order.id);
      return {
        callId: call.id, connectedSeconds: current?.connectedSeconds ?? 0, duplicate: true,
        shouldEndRoom: input.kind !== "room_finished" && remainingSeconds > 0 &&
          (current?.connectedSeconds ?? 0) >= remainingSeconds,
      };
    }

    let participantRole: "student" | "institute" | "system" = "system";
    if (input.identity) {
      if (input.kind === "left") {
        const [priorJoin] = await tx.select({
          participantRole: serviceCallMediaEvents.participantRole,
        }).from(serviceCallMediaEvents).where(and(
          eq(serviceCallMediaEvents.serviceCallId, call.id),
          eq(serviceCallMediaEvents.participantUserId, input.identity),
          eq(serviceCallMediaEvents.kind, "joined"),
        )).limit(1);
        if (!priorJoin || !["student", "institute"].includes(priorJoin.participantRole)) {
          throw new LiveKitUsageEventError("participant_unverified");
        }
        participantRole = priorJoin.participantRole as "student" | "institute";
      } else if (order.studentUserId === input.identity) {
        const [student] = await tx.select({ id: memberships.id }).from(memberships).where(and(
          eq(memberships.userId, input.identity), eq(memberships.role, "student"),
          eq(memberships.status, "active"),
        )).limit(1);
        if (!student) throw new LiveKitUsageEventError("participant_unverified");
        participantRole = "student";
      } else {
        const [institute] = await tx.select({ id: memberships.id }).from(memberships)
          .innerJoin(verifiedEntities, and(
            eq(verifiedEntities.id, memberships.instituteId),
            eq(verifiedEntities.role, "institute"),
          )).where(and(
            eq(memberships.userId, input.identity),
            eq(memberships.instituteId, order.instituteId),
            eq(memberships.role, "institute"), eq(memberships.status, "active"),
          )).limit(1);
        if (!institute) throw new LiveKitUsageEventError("participant_unverified");
        participantRole = "institute";
      }
    }

    await tx.insert(serviceCallMediaEvents).values({
      providerEventId: input.eventId,
      serviceCallId: call.id,
      participantUserId: input.identity,
      participantRole,
      kind: input.kind,
      occurredAt: input.occurredAt,
    });
    const events = await tx.select({
      id: serviceCallMediaEvents.providerEventId,
      participantRole: serviceCallMediaEvents.participantRole,
      participantUserId: serviceCallMediaEvents.participantUserId,
      kind: serviceCallMediaEvents.kind,
      occurredAt: serviceCallMediaEvents.occurredAt,
    }).from(serviceCallMediaEvents).where(eq(serviceCallMediaEvents.serviceCallId, call.id));
    const connectedSeconds = calculateConnectedOverlapSeconds(events as PresenceEvent[]);
    const endedAt = input.kind === "room_finished" ? input.occurredAt : undefined;
    await tx.update(instituteServiceCalls).set({
      connectedSeconds,
      ...(endedAt && call.status === "started" ? { status: "ended", endedAt } : {}),
      updatedAt: new Date(),
    }).where(eq(instituteServiceCalls.id, call.id));
    if (input.kind === "room_finished" && connectedSeconds > 0) {
      await tx.insert(serviceTimeLedger).values({
        serviceOrderId: call.serviceOrderId,
        eventKey: `service-call-usage:livekit:${input.eventId}`,
        eventType: "consume",
        seconds: connectedSeconds,
        serviceSessionId: call.id,
      }).onConflictDoNothing();
    }
    const remainingSeconds = await remainingServiceSeconds(tx, order.id);
    return {
      callId: call.id, connectedSeconds, duplicate: false,
      shouldEndRoom: input.kind !== "room_finished" && remainingSeconds > 0 &&
        connectedSeconds >= remainingSeconds,
    };
  });
  if (result.shouldEndRoom && process.env.DENA_LIVEKIT_ENABLED === "1" &&
      process.env.DENA_LIVEKIT_ROOM_CONTROL_ENABLED !== "0") {
    await closeLiveKitRoom(input.callId);
  }
  return result;
}

/** Called by Dena's quota worker every second. LiveKit itself does not impose
 * a per-call duration from the JWT's expiry, so the worker closes rooms whose
 * remaining paid seconds have elapsed while both sides are connected. */
export async function enforceLiveKitServiceCallQuotas(limit = 5_000) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5_000) throw new Error("invalid limit");
  if (process.env.DENA_LIVEKIT_ENABLED !== "1" ||
      process.env.DENA_LIVEKIT_ROOM_CONTROL_ENABLED === "0") return { closedRooms: 0 };
  const calls = await getDb().select({
    id: instituteServiceCalls.id,
    serviceOrderId: instituteServiceCalls.serviceOrderId,
  }).from(instituteServiceCalls).innerJoin(instituteServiceOrders, and(
    eq(instituteServiceOrders.id, instituteServiceCalls.serviceOrderId),
    eq(instituteServiceOrders.status, "paid"),
  )).where(eq(instituteServiceCalls.status, "started"))
    .orderBy(asc(instituteServiceCalls.id)).limit(limit);
  let closedRooms = 0;
  for (const call of calls) {
    const events = await getDb().select({
      id: serviceCallMediaEvents.providerEventId,
      participantRole: serviceCallMediaEvents.participantRole,
      participantUserId: serviceCallMediaEvents.participantUserId,
      kind: serviceCallMediaEvents.kind,
      occurredAt: serviceCallMediaEvents.occurredAt,
    }).from(serviceCallMediaEvents).where(eq(serviceCallMediaEvents.serviceCallId, call.id));
    const presence = calculatePresenceSummary(events as PresenceEvent[]);
    if (!presence.activeOverlap || !presence.lastEventAt) continue;
    const [balance] = await getDb().select({
      seconds: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.seconds} else -${serviceTimeLedger.seconds} end), 0)::int`,
    }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, call.serviceOrderId));
    const remainingSeconds = Math.max(0, balance?.seconds ?? 0);
    const elapsedSinceEvent = Math.max(0, Math.floor(
      (Date.now() - presence.lastEventAt.getTime()) / 1000,
    ));
    if (presence.connectedSeconds + elapsedSinceEvent < remainingSeconds) continue;
    await closeLiveKitRoom(call.id);
    closedRooms++;
  }
  return { closedRooms };
}

async function remainingServiceSeconds(tx: FinancialJournalTransaction, orderId: string) {
  const [balance] = await tx.select({
    seconds: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.seconds} else -${serviceTimeLedger.seconds} end), 0)::int`,
  }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, orderId));
  return Math.max(0, balance?.seconds ?? 0);
}
