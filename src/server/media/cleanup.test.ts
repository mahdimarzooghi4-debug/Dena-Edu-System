import { afterEach, describe, expect, it } from "vitest";
import { cleanupDelaySeconds, secureCleanupToken } from "./cleanup";
const keys = [
  "DENA_MEDIA_CLEANUP_ENABLED", "DENA_MEDIA_CLEANUP_TOKEN",
  "DENA_PRIVATE_MEDIA_ORIGIN_TOKEN", "DENA_MEDIA_PROCESSOR_TOKEN",
  "DENA_MEDIA_ATTESTATION_HMAC_KEY",
] as const;
const initial = Object.fromEntries(keys.map(k => [k, process.env[k]]));
afterEach(() => {
  for (const key of keys) {
    if (initial[key] === undefined) delete process.env[key];
    else process.env[key] = initial[key];
  }
});
describe("deny-by-default independent quarantine cleanup", () => {
  it("uses distinct secret, feature flag and timing-safe full token matching", () => {
    const secret = "c".repeat(64);
    process.env.DENA_MEDIA_CLEANUP_TOKEN = secret;
    expect(secureCleanupToken(`Bearer ${secret}`)).toBe(false);
    process.env.DENA_MEDIA_CLEANUP_ENABLED = "1";
    expect(secureCleanupToken(`Bearer ${secret}`)).toBe(true);
    expect(secureCleanupToken(`Bearer ${secret}x`)).toBe(false);
    expect(secureCleanupToken(null)).toBe(false);
    for (const key of keys.slice(2)) {
      process.env[key] = secret;
      expect(secureCleanupToken(`Bearer ${secret}`)).toBe(false);
      delete process.env[key];
    }
  });
  it("caps dead-letter retries and never accepts malformed attempt", () => {
    expect([1,2,3,4,5].map(cleanupDelaySeconds))
      .toEqual([60,120,240,480,960]);
    for (const attempt of [0,-1,6,1.2,Infinity,NaN]) {
      expect(() => cleanupDelaySeconds(attempt)).toThrow();
    }
  });
});
