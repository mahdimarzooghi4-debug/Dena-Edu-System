import { describe, expect, it } from "vitest";
import { denaQuestionInput } from "./question-bank";

const valid = {
  prompt: "در بانک سؤال دنا پاسخ صحیح را پیدا کنید.",
  options: ["الف", "ب", "ج", "د"],
  correctOption: 1,
};

describe("Dena question bank input", () => {
  it("accepts the Dena-owned question shape without institute course data", () => {
    expect(denaQuestionInput.safeParse(valid).success).toBe(true);
  });

  it("rejects institute ownership fields and incomplete or repeated options", () => {
    expect(denaQuestionInput.safeParse({ ...valid, instituteId: "00000000-0000-4000-8000-000000000001" }).success)
      .toBe(false);
    expect(denaQuestionInput.safeParse({ ...valid, options: ["الف", "الف", "ج", "د"] }).success)
      .toBe(false);
    expect(denaQuestionInput.safeParse({ ...valid, correctOption: -1 }).success)
      .toBe(false);
  });
});
