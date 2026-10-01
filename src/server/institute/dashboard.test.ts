import { describe, expect, it } from "vitest";
import {
  decodeInstituteCourseCursor, encodeInstituteCourseCursor,
} from "./dashboard";

describe("institute course dashboard cursor", () => {
  it("round-trips the stable requestedAt/courseId ordering key", () => {
    const requestedAt = new Date("2026-09-30T10:15:00.000Z");
    const courseId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
    const token = encodeInstituteCourseCursor({ requestedAt, courseId });

    expect(decodeInstituteCourseCursor(token)).toEqual({ requestedAt, courseId });
  });

  it("rejects malformed or oversized cursors", () => {
    expect(decodeInstituteCourseCursor("not-a-cursor")).toBeNull();
    expect(decodeInstituteCourseCursor("x".repeat(1025))).toBeNull();
  });
});
