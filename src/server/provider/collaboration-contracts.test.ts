import { describe, expect, it } from "vitest";
import {
  collaborationDecisionInput, createProviderCollaborationInput,
} from "./collaboration-contracts";

const validRequest = {
  providerId: "11111111-1111-4111-8111-111111111111",
  instituteId: "22222222-2222-4222-8222-222222222222",
  clientRequestId: "33333333-3333-4333-8333-333333333333",
};

describe("provider-institute collaboration contracts", () => {
  it("requires an explicit provider, institute, and idempotency UUID", () => {
    expect(createProviderCollaborationInput.safeParse(validRequest).success).toBe(true);
    expect(createProviderCollaborationInput.safeParse({ ...validRequest, extra: true }).success).toBe(false);
    expect(createProviderCollaborationInput.safeParse({ ...validRequest, instituteId: "bad" }).success).toBe(false);
  });

  it("requires a meaningful reason for either institute or Dena decisions", () => {
    expect(collaborationDecisionInput.safeParse({ action: "approve", reason: "بررسی مدارک و سوابق حرفه‌ای انجام شد." }).success).toBe(true);
    expect(collaborationDecisionInput.safeParse({ action: "reject", reason: "نامعتبر" }).success).toBe(false);
    expect(collaborationDecisionInput.safeParse({ action: "approve", reason: "این تصمیم دلیل دارد اما فیلد اضافی دارد", note: "x" }).success).toBe(false);
  });
});
