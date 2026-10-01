import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { financialEntries, financialJournals } from "../../db/schema";
import { calculateInstituteServiceGrossSplit } from "../institute/services";

const entryInput = z.object({
  account: z.enum([
    "gateway_clearing", "dena_service_commission_payable", "institute_service_payable",
    "dena_provider_commission_payable", "institute_provider_payable",
    "provider_compensation_payable", "gateway_fee_expense", "student_refund_payable",
    "settlement_bank",
  ]),
  side: z.enum(["debit", "credit"]),
  amountRials: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
}).strict();
export const financialJournalInput = z.object({
  eventKey: z.string().regex(/^[a-zA-Z0-9_.:-]{8,180}$/),
  revenueStream: z.enum(["institute_service", "supervised_provider"]),
  eventType: z.enum(["payment_captured", "gateway_fee_recorded", "settlement_received", "refund_issued"]),
  sourceId: z.uuid(),
  createdByUserId: z.uuid().nullable().optional(),
  entries: z.array(entryInput).min(2).max(20),
}).strict().superRefine((journal, ctx) => {
  const debits = journal.entries.filter((entry) => entry.side === "debit")
    .reduce((sum, entry) => sum + BigInt(entry.amountRials), BigInt(0));
  const credits = journal.entries.filter((entry) => entry.side === "credit")
    .reduce((sum, entry) => sum + BigInt(entry.amountRials), BigInt(0));
  if (debits !== credits) ctx.addIssue({
    code: "custom", path: ["entries"], message: "unbalanced_journal",
  });
  const serviceAccounts = new Set([
    "gateway_clearing", "dena_service_commission_payable", "institute_service_payable",
    "gateway_fee_expense", "student_refund_payable", "settlement_bank",
  ]);
  const providerAccounts = new Set([
    "gateway_clearing", "dena_provider_commission_payable", "institute_provider_payable",
    "provider_compensation_payable", "gateway_fee_expense", "student_refund_payable",
    "settlement_bank",
  ]);
  const allowedAccounts = journal.revenueStream === "institute_service"
    ? serviceAccounts : providerAccounts;
  journal.entries.forEach((entry, index) => {
    if (!allowedAccounts.has(entry.account)) ctx.addIssue({
      code: "custom", path: ["entries", index, "account"], message: "account_wrong_revenue_stream",
    });
  });
});
export type FinancialJournalInput = z.infer<typeof financialJournalInput>;
export type FinancialJournalTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export class FinancialJournalIdempotencyError extends Error {
  constructor() { super("financial_journal_idempotency_conflict"); }
}

export function instituteServicePaymentCaptureJournal(input: {
  orderId: string; priceToman: number; paymentEventId: string; createdByUserId?: string;
}) {
  const split = calculateInstituteServiceGrossSplit(input.priceToman);
  return financialJournalInput.parse({
    eventKey: `service-payment:${input.paymentEventId}`,
    revenueStream: "institute_service",
    eventType: "payment_captured",
    sourceId: input.orderId,
    createdByUserId: input.createdByUserId,
    entries: [
      { account: "gateway_clearing", side: "debit", amountRials: split.grossRials },
      { account: "dena_service_commission_payable", side: "credit", amountRials: split.denaShareRials },
      { account: "institute_service_payable", side: "credit", amountRials: split.instituteShareBeforeGatewayFeeRials },
    ],
  });
}

/** Writes an immutable, idempotent, balanced journal inside the caller's
 * transaction. A deferred PostgreSQL constraint trigger independently checks
 * balance and entry count when that transaction commits. */
export async function postFinancialJournal(
  tx: FinancialJournalTransaction,
  input: FinancialJournalInput,
) {
  const parsed = financialJournalInput.parse(input);
  const values = {
    revenueStream: parsed.revenueStream,
    eventType: parsed.eventType,
    sourceId: parsed.sourceId,
    createdByUserId: parsed.createdByUserId ?? null,
  };
  const [created] = await tx.insert(financialJournals).values({
    eventKey: parsed.eventKey,
    ...values,
  }).onConflictDoNothing({ target: financialJournals.eventKey })
    .returning({ id: financialJournals.id });

  if (!created) {
    const [existing] = await tx.select({
      id: financialJournals.id,
      revenueStream: financialJournals.revenueStream,
      eventType: financialJournals.eventType,
      sourceId: financialJournals.sourceId,
      createdByUserId: financialJournals.createdByUserId,
    }).from(financialJournals).where(eq(financialJournals.eventKey, parsed.eventKey)).limit(1);
    if (!existing || existing.revenueStream !== values.revenueStream ||
      existing.eventType !== values.eventType || existing.sourceId !== values.sourceId ||
      existing.createdByUserId !== values.createdByUserId) throw new FinancialJournalIdempotencyError();
    const existingEntries = await tx.select({
      account: financialEntries.account,
      debitRials: financialEntries.debitRials,
      creditRials: financialEntries.creditRials,
    }).from(financialEntries).where(eq(financialEntries.journalId, existing.id));
    const requestedEntries = parsed.entries.map((entry) => ({
      account: entry.account,
      debitRials: entry.side === "debit" ? entry.amountRials : 0,
      creditRials: entry.side === "credit" ? entry.amountRials : 0,
    })).sort((left, right) => (left.account < right.account ? -1 : left.account > right.account ? 1 : 0) ||
      left.debitRials - right.debitRials || left.creditRials - right.creditRials);
    const canonicalExistingEntries = [...existingEntries].sort((left, right) =>
      (left.account < right.account ? -1 : left.account > right.account ? 1 : 0) ||
      left.debitRials - right.debitRials || left.creditRials - right.creditRials);
    if (JSON.stringify(canonicalExistingEntries) !== JSON.stringify(requestedEntries)) {
      throw new FinancialJournalIdempotencyError();
    }
    return { id: existing.id, duplicate: true };
  }

  await tx.insert(financialEntries).values(parsed.entries.map((entry) => ({
    journalId: created.id,
    account: entry.account,
    debitRials: entry.side === "debit" ? entry.amountRials : 0,
    creditRials: entry.side === "credit" ? entry.amountRials : 0,
  })));
  return { id: created.id, duplicate: false };
}
