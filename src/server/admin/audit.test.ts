import { describe, expect, it } from "vitest";
import { decodeAuditCursor, encodeAuditCursor } from "./audit";

describe("admin audit cursors", () => {
  it("round-trips a timestamp and event identifier", () => {
    const createdAt = new Date("2026-09-30T12:34:56.789Z");
    const id = "00000000-0000-4000-8000-000000000001";
    expect(decodeAuditCursor(encodeAuditCursor({ createdAt, id })))
      .toEqual({ createdAt, id });
  });

  it("rejects malformed, oversized, and unexpected cursor values", () => {
    expect(decodeAuditCursor("not-a-cursor")).toBeNull();
    expect(decodeAuditCursor("x".repeat(1025))).toBeNull();
    expect(decodeAuditCursor(Buffer.from(JSON.stringify({
      createdAt: "2026-09-30T12:34:56.789Z",
      id: "00000000-0000-4000-8000-000000000001",
      extra: "ignored inputs are not allowed",
    })).toString("base64url"))).toBeNull();
  });
});
