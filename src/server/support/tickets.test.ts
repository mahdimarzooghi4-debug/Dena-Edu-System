import { describe, expect, it } from "vitest";
import {
  decodeSupportInboxCursor, encodeSupportInboxCursor,
  newTechnicalSupportMessage, newTechnicalSupportTicket,
  updateTechnicalSupportTicket,
} from "./tickets";

describe("technical support input contracts", () => {
  it("accepts a bounded ticket subject and initial message", () => {
    expect(newTechnicalSupportTicket.safeParse({
      subject: "مشکل ورود",
      body: "پس از درخواست کد، صفحه جلو نمی‌رود.",
    }).success).toBe(true);
  });

  it("rejects empty, oversized, and client-selected ownership fields", () => {
    expect(newTechnicalSupportTicket.safeParse({ subject: "  ", body: "متن" }).success).toBe(false);
    expect(newTechnicalSupportTicket.safeParse({
      subject: "ورود",
      body: "x".repeat(5001),
    }).success).toBe(false);
    expect(newTechnicalSupportTicket.safeParse({
      subject: "ورود",
      body: "متن",
      requesterUserId: "00000000-0000-4000-8000-000000000001",
    }).success).toBe(false);
  });

  it("requires non-empty bounded reply text and rejects extra fields", () => {
    expect(newTechnicalSupportMessage.safeParse({ body: "پیگیری شد." }).success).toBe(true);
    expect(newTechnicalSupportMessage.safeParse({ body: "   " }).success).toBe(false);
    expect(newTechnicalSupportMessage.safeParse({
      body: "پاسخ",
      authorUserId: "00000000-0000-4000-8000-000000000001",
    }).success).toBe(false);
  });

  it("accepts only supported ticket states and priorities for operators", () => {
    expect(updateTechnicalSupportTicket.safeParse({
      status: "waiting_requester", priority: "urgent",
    }).success).toBe(true);
    expect(updateTechnicalSupportTicket.safeParse({ status: "deleted" }).success).toBe(false);
    expect(updateTechnicalSupportTicket.safeParse({ priority: "critical" }).success).toBe(false);
    expect(updateTechnicalSupportTicket.safeParse({}).success).toBe(false);
    expect(updateTechnicalSupportTicket.safeParse({ status: "closed", assignedToUserId: "x" }).success)
      .toBe(false);
  });
});

describe("technical support inbox cursor", () => {
  it("round-trips the inbox update time and ticket identifier", () => {
    const updatedAt = new Date("2026-09-30T12:34:56.789Z");
    const id = "00000000-0000-4000-8000-000000000001";
    expect(decodeSupportInboxCursor(encodeSupportInboxCursor({ updatedAt, id })))
      .toEqual({ updatedAt, id });
  });

  it("rejects invalid and oversized cursors", () => {
    expect(decodeSupportInboxCursor("not-a-cursor")).toBeNull();
    expect(decodeSupportInboxCursor("x".repeat(1025))).toBeNull();
  });
});
