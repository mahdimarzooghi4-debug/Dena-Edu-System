import { describe, expect, it } from "vitest";
import {
  financialJournalInput, instituteServicePaymentCaptureJournal,
} from "./ledger";

const orderId = "11111111-1111-4111-8111-111111111111";

describe("Dena financial ledger contracts", () => {
  it("builds balanced payment entries with the approved 10 percent Dena share", () => {
    const journal = instituteServicePaymentCaptureJournal({
      orderId, paymentEventId: "22222222-2222-4222-8222-222222222222", priceToman: 250_000,
    });
    expect(journal.entries).toEqual([
      { account: "gateway_clearing", side: "debit", amountRials: 2_500_000 },
      { account: "dena_service_commission_payable", side: "credit", amountRials: 250_000 },
      { account: "institute_service_payable", side: "credit", amountRials: 2_250_000 },
    ]);
  });

  it("rejects unbalanced journals and account mixing between revenue streams", () => {
    const base = {
      eventKey: "test-event:001",
      eventType: "payment_captured",
      sourceId: orderId,
      entries: [
        { account: "gateway_clearing", side: "debit", amountRials: 1000 },
        { account: "dena_service_commission_payable", side: "credit", amountRials: 100 },
        { account: "institute_service_payable", side: "credit", amountRials: 900 },
      ],
    } as const;
    expect(financialJournalInput.safeParse({ ...base, revenueStream: "institute_service" }).success).toBe(true);
    expect(financialJournalInput.safeParse({
      ...base,
      revenueStream: "institute_service",
      entries: [...base.entries.slice(0, 2), { ...base.entries[2], amountRials: 800 }],
    }).success).toBe(false);
    expect(financialJournalInput.safeParse({
      ...base,
      revenueStream: "supervised_provider",
    }).success).toBe(false);
  });
});
