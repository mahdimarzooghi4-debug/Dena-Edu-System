import { afterEach, describe, expect, it, vi } from "vitest";
import { secureServiceCallQuotaWorkerToken } from "./service-call-quota-worker";

describe("LiveKit quota worker authentication", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the configured worker token over bearer authorization", () => {
    vi.stubEnv("DENA_LIVEKIT_ENABLED", "1");
    vi.stubEnv("DENA_LIVEKIT_QUOTA_WORKER_TOKEN", "q".repeat(48));
    vi.stubEnv("LIVEKIT_API_SECRET", "l".repeat(48));
    expect(secureServiceCallQuotaWorkerToken(`Bearer ${"q".repeat(48)}`)).toBe(true);
    expect(secureServiceCallQuotaWorkerToken("q".repeat(48))).toBe(false);
    expect(secureServiceCallQuotaWorkerToken(`Bearer ${"x".repeat(48)}`)).toBe(false);
    vi.stubEnv("DENA_LIVEKIT_ENABLED", "0");
    expect(secureServiceCallQuotaWorkerToken(`Bearer ${"q".repeat(48)}`)).toBe(false);
  });
});
