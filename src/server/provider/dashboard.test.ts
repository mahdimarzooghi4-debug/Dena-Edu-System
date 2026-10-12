import { describe, expect, it } from "vitest";
import { decodeProviderCourseCursor, encodeProviderCourseCursor } from "./dashboard";

describe("provider course dashboard cursor", () => {
  it("round-trips the stable requestedAt/courseId ordering key", () => {
    const requestedAt = new Date("2026-09-30T10:15:00.000Z");
    const courseId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
    const token = encodeProviderCourseCursor({ requestedAt, courseId });

    expect(decodeProviderCourseCursor(token)).toEqual({ requestedAt, courseId });
  });

  it("rejects malformed or oversized cursors", () => {
    expect(decodeProviderCourseCursor("not-a-cursor")).toBeNull();
    expect(decodeProviderCourseCursor("x".repeat(1025))).toBeNull();
  });
});
