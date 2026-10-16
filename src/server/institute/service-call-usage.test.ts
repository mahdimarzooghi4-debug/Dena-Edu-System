import { describe, expect, it, vi } from "vitest";
import {
  handleServiceCallUsageWebhook,
  ServiceCallUsageError,
  verifiedServiceCallUsage,
  type VerifiedServiceCallUsage,
} from "./service-call-usage";

const usageEvent = {
  eventId: "livekit-event-123456",
  callId: "9f4fcd3c-2193-4bce-88d0-490d9ce83e2e",
  state: "ended",
  billableMinutes: 17,
} as const;

describe("verified service call usage boundary", () => {
  it("accepts only a final exact integer-minute event", () => {
    expect(verifiedServiceCallUsage.parse(usageEvent)).toEqual(usageEvent);
    expect(verifiedServiceCallUsage.safeParse({ ...usageEvent, state: "started" }).success).toBe(false);
    expect(verifiedServiceCallUsage.safeParse({ ...usageEvent, billableMinutes: 0 }).success).toBe(false);
    expect(verifiedServiceCallUsage.safeParse({ ...usageEvent, billableMinutes: 1.5 }).success).toBe(false);
    expect(verifiedServiceCallUsage.safeParse({ ...usageEvent, unexpected: true }).success).toBe(false);
  });

  it("verifies raw bytes before forwarding the normalized event to the ledger", async () => {
    const rawBody = new TextEncoder().encode("provider-payload");
    const headers = new Headers({ "x-provider-signature": "opaque" });
    const verifyWebhook = vi.fn(async (input: { headers: Headers; rawBody: Uint8Array }) => {
      expect(input.headers).toBe(headers);
      expect(input.rawBody).toBe(rawBody);
      return usageEvent;
    });
    const record = vi.fn(async (input: {
      providerId: string;
      event: VerifiedServiceCallUsage;
    }) => ({
      serviceOrderId: "0cc86a62-b113-4d1c-a8b5-9db4da570c42",
      callId: input.event.callId,
      consumedMinutes: input.event.billableMinutes,
      remainingMinutes: 43,
      duplicate: false,
    }));
    const result = await handleServiceCallUsageWebhook(
      { headers, rawBody },
      { providerId: "livekit", verifyWebhook },
      record,
    );
    expect(result).toEqual({
      serviceOrderId: "0cc86a62-b113-4d1c-a8b5-9db4da570c42",
      callId: usageEvent.callId, consumedMinutes: 17, remainingMinutes: 43, duplicate: false,
    });
    expect(verifyWebhook).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({ providerId: "livekit", event: usageEvent });
  });

  it("rejects unsigned, invalid, oversized and empty webhook requests", async () => {
    let verifiedEvent: unknown = null;
    const adapter = { providerId: "livekit", verifyWebhook: vi.fn(async () => verifiedEvent) };
    const input = { headers: new Headers(), rawBody: new Uint8Array([1]) };
    await expect(handleServiceCallUsageWebhook(input, adapter))
      .rejects.toMatchObject({ kind: "event_unverified" });
    verifiedEvent = { ...usageEvent, state: "started" };
    await expect(handleServiceCallUsageWebhook(input, adapter))
      .rejects.toMatchObject({ kind: "event_invalid" });
    await expect(handleServiceCallUsageWebhook(
      { headers: input.headers, rawBody: new Uint8Array(65 * 1024) }, adapter,
    )).rejects.toMatchObject({ kind: "request_invalid" });
    await expect(handleServiceCallUsageWebhook(
      { headers: input.headers, rawBody: new Uint8Array() }, adapter,
    )).rejects.toMatchObject({ kind: "request_invalid" });
  });

  it("hides adapter errors and refuses invalid provider namespaces", async () => {
    const adapter = {
      providerId: "livekit",
      verifyWebhook: vi.fn(async () => { throw new Error("secret=private-payload"); }),
    };
    await expect(handleServiceCallUsageWebhook(
      { headers: new Headers(), rawBody: new Uint8Array([1]) }, adapter,
    )).rejects.toEqual(new ServiceCallUsageError("provider_unavailable"));
    await expect(handleServiceCallUsageWebhook(
      { headers: new Headers(), rawBody: new Uint8Array([1]) },
      { providerId: "../unsafe", verifyWebhook: vi.fn() },
    )).rejects.toMatchObject({ kind: "request_invalid" });
  });
});
