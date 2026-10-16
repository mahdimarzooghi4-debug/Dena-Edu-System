import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { instituteServiceCalls, instituteServiceOrders, serviceTimeLedger } from "../../db/schema";
import type { FinancialJournalTransaction } from "../finance/ledger";

export const verifiedServiceCallUsage = z.object({
  eventId: z.string().regex(/^[A-Za-z0-9._:-]{8,100}$/),
  callId: z.uuid(),
  state: z.literal("ended"),
  /** Final minutes supplied by a trusted adapter under an approved billing rule. */
  billableMinutes: z.number().int().min(1).max(100_000),
}).strict();
export type VerifiedServiceCallUsage = z.infer<typeof verifiedServiceCallUsage>;

export interface ServiceCallUsageAdapter {
  readonly providerId: string;
  /** Verify raw bytes, provider signature and replay rules before returning an event. */
  verifyWebhook(input: { headers: Headers; rawBody: Uint8Array }): Promise<unknown | null>;
}

export class ServiceCallUsageError extends Error {
  constructor(readonly kind:
    "request_invalid" | "provider_unavailable" | "event_unverified" | "event_invalid" |
    "call_unavailable" | "service_not_ready" | "call_not_ended" |
    "quota_exceeded" | "event_reused") {
    super(kind);
  }
}

const providerIdPattern = /^[a-z][a-z0-9._-]{1,30}$/;
const MAX_WEBHOOK_BYTES = 64 * 1024;
const usageEventKey = (providerId: string, eventId: string) =>
  `service-call-usage:${providerId}:${eventId}`;

/** Records a provider-measured final usage value. This function does not derive
 * minutes from timestamps, choose rounding, or decide what is billable.
 */
export async function recordInstituteServiceCallUsage(input: {
  providerId: string;
  event: VerifiedServiceCallUsage;
}) {
  if (!input || !providerIdPattern.test(input.providerId)) {
    throw new ServiceCallUsageError("request_invalid");
  }
  const parsed = verifiedServiceCallUsage.safeParse(input.event);
  if (!parsed.success) throw new ServiceCallUsageError("event_invalid");
  const eventKey = usageEventKey(input.providerId, parsed.data.eventId);

  return getDb().transaction(async (tx) => {
    const [callReference] = await tx.select({
      id: instituteServiceCalls.id,
      serviceOrderId: instituteServiceCalls.serviceOrderId,
    }).from(instituteServiceCalls).where(eq(
      instituteServiceCalls.id, parsed.data.callId,
    )).limit(1);
    if (!callReference) throw new ServiceCallUsageError("call_unavailable");

    // Match the existing order → call lock order so concurrent usage events
    // serialize with call transitions and payment/quota updates.
    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      status: instituteServiceOrders.status,
      includedMinutes: instituteServiceOrders.includedMinutes,
      guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
      guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
    }).from(instituteServiceOrders).where(eq(
      instituteServiceOrders.id, callReference.serviceOrderId,
    )).limit(1).for("update");
    if (!order) throw new ServiceCallUsageError("call_unavailable");
    if (order.status !== "paid" || order.includedMinutes === null ||
      (order.guardianConsentRequired && !order.guardianConsentConfirmedAt)) {
      throw new ServiceCallUsageError("service_not_ready");
    }

    const [call] = await tx.select({
      id: instituteServiceCalls.id,
      status: instituteServiceCalls.status,
      endedAt: instituteServiceCalls.endedAt,
    }).from(instituteServiceCalls).where(and(
      eq(instituteServiceCalls.id, callReference.id),
      eq(instituteServiceCalls.serviceOrderId, order.id),
    )).limit(1).for("update");
    if (!call) throw new ServiceCallUsageError("call_unavailable");
    if (call.status !== "ended" || !call.endedAt) {
      throw new ServiceCallUsageError("call_not_ended");
    }

    const [existingEvent] = await tx.select({
      serviceOrderId: serviceTimeLedger.serviceOrderId,
      eventType: serviceTimeLedger.eventType,
      minutes: serviceTimeLedger.minutes,
      serviceSessionId: serviceTimeLedger.serviceSessionId,
    }).from(serviceTimeLedger).where(eq(serviceTimeLedger.eventKey, eventKey)).limit(1);
    if (existingEvent) {
      if (existingEvent.serviceOrderId !== order.id || existingEvent.eventType !== "consume" ||
        existingEvent.minutes !== parsed.data.billableMinutes ||
        existingEvent.serviceSessionId !== call.id) {
        throw new ServiceCallUsageError("event_reused");
      }
      const balance = await remainingQuota(tx, order.id);
      return {
        serviceOrderId: order.id, callId: call.id,
        consumedMinutes: existingEvent.minutes,
        remainingMinutes: balance, duplicate: true,
      };
    }

    const [existingCallUsage] = await tx.select({ id: serviceTimeLedger.id })
      .from(serviceTimeLedger).where(and(
        eq(serviceTimeLedger.serviceSessionId, call.id),
        eq(serviceTimeLedger.eventType, "consume"),
      )).limit(1);
    if (existingCallUsage) throw new ServiceCallUsageError("event_reused");

    const remainingMinutes = await remainingQuota(tx, order.id);
    if (parsed.data.billableMinutes > remainingMinutes) {
      throw new ServiceCallUsageError("quota_exceeded");
    }
    await tx.insert(serviceTimeLedger).values({
      serviceOrderId: order.id,
      eventKey,
      eventType: "consume",
      minutes: parsed.data.billableMinutes,
      serviceSessionId: call.id,
    });
    return {
      serviceOrderId: order.id, callId: call.id,
      consumedMinutes: parsed.data.billableMinutes,
      remainingMinutes: remainingMinutes - parsed.data.billableMinutes,
      duplicate: false,
    };
  });
}

async function remainingQuota(tx: FinancialJournalTransaction, orderId: string) {
  const [balance] = await tx.select({
    minutes: sql<number>`coalesce(sum(case when ${serviceTimeLedger.eventType} = 'grant' then ${serviceTimeLedger.minutes} else -${serviceTimeLedger.minutes} end), 0)::int`,
  }).from(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, orderId));
  return Math.max(0, balance?.minutes ?? 0);
}

type RecordUsage = typeof recordInstituteServiceCallUsage;

/** Authenticates provider callbacks before recording a final usage event.
 * No HTTP route is exposed until a provider and its policy have been selected.
 */
export async function handleServiceCallUsageWebhook(
  input: { headers: Headers; rawBody: Uint8Array },
  adapter: ServiceCallUsageAdapter,
  record: RecordUsage = recordInstituteServiceCallUsage,
) {
  if (!input || !(input.headers instanceof Headers) ||
    !(input.rawBody instanceof Uint8Array) || input.rawBody.byteLength < 1 ||
    input.rawBody.byteLength > MAX_WEBHOOK_BYTES || !adapter ||
    !providerIdPattern.test(adapter.providerId)) {
    throw new ServiceCallUsageError("request_invalid");
  }
  let event: unknown;
  try {
    event = await adapter.verifyWebhook({ headers: input.headers, rawBody: input.rawBody });
  } catch {
    throw new ServiceCallUsageError("provider_unavailable");
  }
  if (event === null) throw new ServiceCallUsageError("event_unverified");
  const parsed = verifiedServiceCallUsage.safeParse(event);
  if (!parsed.success) throw new ServiceCallUsageError("event_invalid");
  return record({ providerId: adapter.providerId, event: parsed.data });
}
