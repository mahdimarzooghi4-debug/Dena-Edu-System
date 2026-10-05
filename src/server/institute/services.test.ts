import { describe, expect, it } from "vitest";
import {
  calculateInstituteServiceGrossSplit, instituteServiceCreateInput,
  instituteServiceUpdateInput,
} from "./services";

const serviceInput = {
  instituteId: "11111111-1111-4111-8111-111111111111",
  title: "جلسهٔ مشاورهٔ تحصیلی",
  category: "consultation",
  description: "یک جلسه برای بررسی نیازهای آموزشی دانش‌آموز.",
  priceToman: 250_000,
  includedMinutes: 60,
  validityDays: 30,
  guardianConsentRequired: true,
  cancellationPolicy: "لغو تا ۲۴ ساعت قبل از زمان جلسه امکان‌پذیر است.",
};

describe("institute service catalog contracts", () => {
  it("accepts a priced service with an explicit time quota and consent policy", () => {
    expect(instituteServiceCreateInput.safeParse(serviceInput).success).toBe(true);
  });

  it("requires time quota and expiry to be set together", () => {
    expect(instituteServiceCreateInput.safeParse({
      ...serviceInput, includedMinutes: 60, validityDays: null,
    }).success).toBe(false);
    expect(instituteServiceCreateInput.safeParse({
      ...serviceInput, includedMinutes: null, validityDays: null,
    }).success).toBe(true);
  });

  it("requires status only on update", () => {
    const fields = Object.fromEntries(Object.entries(serviceInput)
      .filter(([key]) => key !== "instituteId"));
    expect(instituteServiceUpdateInput.safeParse({ ...fields, status: "paused" }).success).toBe(true);
    expect(instituteServiceUpdateInput.safeParse({ ...fields, status: "deleted" }).success).toBe(false);
  });

  it("splits the gross amount in rial and keeps gateway fees on the institute", () => {
    expect(calculateInstituteServiceGrossSplit(250_000)).toEqual({
      grossRials: 2_500_000,
      denaShareRials: 250_000,
      instituteShareBeforeGatewayFeeRials: 2_250_000,
    });
  });

  it("rejects prices outside the supported safe integer range", () => {
    expect(() => calculateInstituteServiceGrossSplit(0)).toThrow();
    expect(() => calculateInstituteServiceGrossSplit(Number.MAX_SAFE_INTEGER)).toThrow();
  });
});
