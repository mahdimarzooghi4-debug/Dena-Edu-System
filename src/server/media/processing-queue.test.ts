import { describe, expect, it } from "vitest";
import {
  MAX_PROCESSING_ATTEMPTS, PROCESSING_LEASE_SECONDS, retryDelaySeconds,
} from "./processing-queue";

describe("durable processing queue retry contract", () => {
  it("bounds lease and exponential backoff, with an explicit dead-letter cap", () => {
    expect(PROCESSING_LEASE_SECONDS).toBe(300);
    expect(MAX_PROCESSING_ATTEMPTS).toBe(5);
    expect(Array.from({ length: 5 }, (_, i) =>
      retryDelaySeconds(i + 1))).toEqual([30, 60, 120, 240, 480]);
    expect(retryDelaySeconds(999)).toBe(3600);
    for (const value of [-1, 0, 1.2, NaN]) {
      expect(() => retryDelaySeconds(value)).toThrow();
    }
  });
});
