import { recordVerifiedProviderRevenueInTransaction } from "./provider-revenue";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { instituteServiceOrders, serviceTimeLedger } from "../../db/schema";
import {
  FinancialJournalTransaction,
  instituteServicePaymentCaptureJournal,
  postFinancialJournal,
} from "./ledger";

export const instituteServicePaymentCaptureInput = z.object({
  orderId: z.uuid(),
  gatewayEventId: z.string().regex(/^[A-Za-z0-9._:-]{8,140}$/),
  capturedAt: z.iso.datetime({offset:true}).optional(),
  gatewayFeeRials: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  grossRials: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
}).strict();
export type InstituteServicePaymentCaptureInput = z.infer<
  typeof instituteServicePaymentCaptureInput
>;

export class InstituteServicePaymentError extends Error {
  constructor(readonly kind:
    "order_unavailable" | "order_not_payable" | "amount_mismatch" | "event_reused") {
    super(kind);
  }
}

/**
 * Applies a gateway-verified capture to one pending institute service order.
 * The provider adapter must authenticate and normalize its webhook before
 * calling this function. Order state and the immutable balanced journal commit
 * atomically; this function does not contact a gateway or treat redirects as
 * payment evidence.
 */
export async function captureInstituteServiceOrderPayment(
  input: InstituteServicePaymentCaptureInput,
) {
  const parsed = instituteServicePaymentCaptureInput.parse(input);
  return getDb().transaction(async (tx) => {
    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      providerContractId: instituteServiceOrders.providerContractId,
      priceToman: instituteServiceOrders.priceToman,
      grossRials: instituteServiceOrders.grossRials,
      status: instituteServiceOrders.status,
      paidAt: instituteServiceOrders.paidAt,
      guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
      guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
      includedMinutes: instituteServiceOrders.includedMinutes,
    }).from(instituteServiceOrders)
      .where(eq(instituteServiceOrders.id, parsed.orderId)).limit(1).for("update");
    if (!order) throw new InstituteServicePaymentError("order_unavailable");
    if (order.grossRials !== parsed.grossRials) {
      throw new InstituteServicePaymentError("amount_mismatch");
    }
    if (order.status === "paid" && order.paidAt) {
      const journal = await postOrderCapture(tx, parsed, order.priceToman, order.providerContractId);
      if (!journal.duplicate) throw new InstituteServicePaymentError("event_reused");
      await grantPurchasedQuota(tx, order.id, order.includedMinutes);
      return { orderId: order.id, status: "paid" as const, duplicate: true };
    }
    if (order.status !== "awaiting_payment" ||
      (order.guardianConsentRequired && !order.guardianConsentConfirmedAt)) {
      throw new InstituteServicePaymentError("order_not_payable");
    }

    const journal = await postOrderCapture(tx, parsed, order.priceToman, order.providerContractId);
    if (journal.duplicate) {
      // A journal without the matching paid order would violate the atomic
      // transition contract. Roll back and surface a conflict for review.
      throw new InstituteServicePaymentError("event_reused");
    }
    const paidAt = new Date();
    await tx.update(instituteServiceOrders).set({
      status: "paid",
      paidAt,
      updatedAt: paidAt,
    }).where(eq(instituteServiceOrders.id, order.id));
    await grantPurchasedQuota(tx, order.id, order.includedMinutes);
    return { orderId: order.id, status: "paid" as const, duplicate: false };
  });
}

async function grantPurchasedQuota(
  tx: FinancialJournalTransaction,
  orderId: string,
  includedMinutes: number | null,
) {
  if (includedMinutes === null) return;
  await tx.insert(serviceTimeLedger).values({
    serviceOrderId: orderId,
    eventKey: `service-quota-grant:${orderId}`,
    eventType: "grant",
    seconds: includedMinutes * 60,
  }).onConflictDoNothing({ target: serviceTimeLedger.eventKey });
}

async function postCaptureJournal(
  tx: FinancialJournalTransaction,
  input: InstituteServicePaymentCaptureInput,
  priceToman: number,
) {
  return postFinancialJournal(tx, instituteServicePaymentCaptureJournal({
    orderId: input.orderId,
    priceToman,
    paymentEventId: input.gatewayEventId,
  }));
}

async function postOrderCapture(tx:FinancialJournalTransaction,input:InstituteServicePaymentCaptureInput,priceToman:number,providerContractId:string|null) {
  if(!providerContractId) return postCaptureJournal(tx,input,priceToman);
  if(input.capturedAt===undefined||input.gatewayFeeRials===undefined) throw new InstituteServicePaymentError("order_not_payable");
  return recordVerifiedProviderRevenueInTransaction(tx,{
    eventKey:input.gatewayEventId,sourceId:input.orderId,contractId:providerContractId,
    capturedAt:input.capturedAt,grossRials:input.grossRials,gatewayFeeRials:input.gatewayFeeRials,
  });
}
