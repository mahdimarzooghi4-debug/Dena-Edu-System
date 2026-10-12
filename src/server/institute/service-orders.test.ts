import { describe, expect, it } from "vitest";
import { summarizeInstituteServiceOrderStatuses } from "./service-orders";

describe("institute service order summaries", () => {
  it("fills each workflow status with a count from scoped aggregate rows", () => {
    expect(summarizeInstituteServiceOrderStatuses([
      { status: "awaiting_guardian_consent", total: 2 },
      { status: "paid", total: 5 },
    ])).toEqual({
      awaiting_guardian_consent: 2,
      awaiting_payment: 0,
      paid: 5,
      cancelled: 0,
    });
  });

  it("does not mutate or expose the input aggregate rows", () => {
    const rows = [{ status: "cancelled" as const, total: 3 }];
    expect(summarizeInstituteServiceOrderStatuses(rows).cancelled).toBe(3);
    expect(rows).toEqual([{ status: "cancelled", total: 3 }]);
  });
});
