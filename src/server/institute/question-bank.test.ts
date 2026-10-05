import { describe, expect, it } from "vitest";
import { instituteQuestionInput } from "./question-bank";

const valid = {
  courseId: "00000000-0000-4000-8000-000000000001",
  lessonAssetId: "00000000-0000-4000-8000-000000000002",
  prompt: "کدام گزینه پاسخ این پرسش را نشان می‌دهد؟",
  options: ["گزینهٔ یک", "گزینهٔ دو", "گزینهٔ سه", "گزینهٔ چهار"],
  correctOption: 2,
};

describe("institute question bank input", () => {
  it("accepts a complete four-option question with a selected answer", () => {
    expect(instituteQuestionInput.safeParse(valid).success).toBe(true);
  });

  it("rejects duplicate options and out-of-range answer keys", () => {
    expect(instituteQuestionInput.safeParse({ ...valid,
      options: ["تکراری", "تکراری", "سه", "چهار"],
    }).success).toBe(false);
    expect(instituteQuestionInput.safeParse({ ...valid, correctOption: 4 }).success)
      .toBe(false);
  });

  it("rejects client-supplied ownership fields and malformed course IDs", () => {
    expect(instituteQuestionInput.safeParse({ ...valid,
      ownerId: "00000000-0000-4000-8000-000000000003",
    }).success).toBe(false);
    expect(instituteQuestionInput.safeParse({ ...valid, courseId: "client-scope" })
      .success).toBe(false);
  });
});
