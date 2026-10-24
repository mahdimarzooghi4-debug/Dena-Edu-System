import { describe, expect, it } from "vitest";
import { publishInstituteServiceCallFollowUpInput } from "./service-calls";

describe("student-visible service call follow-up contract", () => {
  it("trims the intentionally shared summary and next steps", () => {
    expect(publishInstituteServiceCallFollowUpInput.parse({
      summary: "  برنامهٔ هفته آماده شد.  ",
      nextSteps: ["  مرور فصل سوم  ", "ثبت پرسش‌ها"],
    })).toEqual({
      summary: "برنامهٔ هفته آماده شد.",
      nextSteps: ["مرور فصل سوم", "ثبت پرسش‌ها"],
    });
  });

  it("rejects empty summaries, private-note fields, and more than ten steps", () => {
    expect(publishInstituteServiceCallFollowUpInput.safeParse({
      summary: "   ", nextSteps: [],
    }).success).toBe(false);
    expect(publishInstituteServiceCallFollowUpInput.safeParse({
      summary: "متن نتیجهٔ جلسه معتبر است.", nextSteps: [], privateNotes: "private",
    }).success).toBe(false);
    expect(publishInstituteServiceCallFollowUpInput.safeParse({
      summary: "متن نتیجهٔ جلسه معتبر است.", nextSteps: Array.from({ length: 11 }, () => "گام"),
    }).success).toBe(false);
  });
});
