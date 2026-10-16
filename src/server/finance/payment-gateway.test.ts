import { describe, expect, it, vi } from "vitest";
import {
  handleServicePaymentWebhook, PaymentGatewayBoundaryError,
  type ServicePaymentGatewayAdapter, type VerifiedPaymentCapture,
} from "./payment-gateway";

const request = {
  headers: new Headers({ "content-type": "application/json" }),
  rawBody: new TextEncoder().encode('{"event":"captured"}'),
};
const captureEvent: VerifiedPaymentCapture = {
  eventId: "evt_20261016_0001",
  orderId: "b160bbf5-24ac-4812-98ea-9dd7856b9a1a",
  grossRials: 2_500_000,
  currency: "IRR",
  state: "captured",
};
function adapter(result: unknown): ServicePaymentGatewayAdapter {
  return {
    providerId: "selected-gateway",
    verifyWebhook: vi.fn(async ({ rawBody }) => {
      expect(rawBody).toBe(request.rawBody);
      return result;
    }),
  };
}

describe("vendor-neutral payment webhook boundary", () => {
  it("passes only verified captures to the atomic ledger transition", async () => {
    const verify = adapter(captureEvent);
    const capture = vi.fn(async () => ({ status: "paid" }));
    await expect(handleServicePaymentWebhook(request, verify, capture)).resolves
      .toEqual({ status: "paid" });
    expect(verify.verifyWebhook).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith({
      orderId: captureEvent.orderId,
      gatewayEventId: "selected-gateway:evt_20261016_0001",
      grossRials: 2_500_000,
    });
  });

  it("does not capture missing, non-captured, wrong-currency, or extra fields", async () => {
    const capture = vi.fn(async () => undefined);
    for (const event of [null, { ...captureEvent, state: "authorized" },
      { ...captureEvent, currency: "USD" }, { ...captureEvent, orderId: undefined },
      { ...captureEvent, signature: "must-not-cross-the-boundary" }]) {
      await expect(handleServicePaymentWebhook(request, adapter(event), capture))
        .rejects.toBeInstanceOf(PaymentGatewayBoundaryError);
    }
    expect(capture).not.toHaveBeenCalled();
  });

  it("sanitizes provider failures and rejects malformed or oversized requests first", async () => {
    const failing: ServicePaymentGatewayAdapter = {
      providerId: "selected-gateway",
      verifyWebhook: async () => { throw new Error("secret signature and payload"); },
    };
    await expect(handleServicePaymentWebhook(request, failing))
      .rejects.toMatchObject({ kind: "gateway_unavailable", message: "gateway_unavailable" });

    const verify = vi.fn(async () => captureEvent);
    await expect(handleServicePaymentWebhook({ ...request, rawBody: new Uint8Array() },
      { providerId: "selected-gateway", verifyWebhook: verify }))
      .rejects.toMatchObject({ kind: "request_invalid" });
    await expect(handleServicePaymentWebhook({ ...request,
      rawBody: new Uint8Array(64 * 1024 + 1) },
    { providerId: "selected-gateway", verifyWebhook: verify }))
      .rejects.toMatchObject({ kind: "request_invalid" });
    await expect(handleServicePaymentWebhook(request,
      { providerId: "Selected Gateway", verifyWebhook: verify }))
      .rejects.toMatchObject({ kind: "request_invalid" });
    expect(verify).not.toHaveBeenCalled();
  });
});
