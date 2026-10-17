import { describe, expect, it, vi } from "vitest";
import {
  createServicePaymentIntent, handleServicePaymentWebhook, PaymentGatewayBoundaryError,
  PaymentIntentBoundaryError,
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

const intentRequest = {
  orderId: captureEvent.orderId,
  grossRials: captureEvent.grossRials,
  currency: "IRR" as const,
  idempotencyKey: "99dd70b1-3c4e-4f11-a622-a702958c37c7",
};
const allowedCheckoutOrigins = new Set(["https://checkout.example.test"]);
const intentResponse = {
  providerIntentId: "intent_20261016_001",
  orderId: captureEvent.orderId,
  grossRials: captureEvent.grossRials,
  currency: "IRR" as const,
  checkoutUrl: "https://checkout.example.test/session/token",
  expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
};
function intentAdapter(createPaymentIntent: (input: typeof intentRequest) => Promise<unknown>) {
  return {
    providerId: "selected-gateway",
    allowedCheckoutOrigins,
    createPaymentIntent: vi.fn(createPaymentIntent),
  };
}

describe("vendor-neutral payment intent boundary", () => {
  it("forwards a server-derived amount and idempotency key and returns only a verified checkout", async () => {
    const adapter = intentAdapter(async (input) => {
      expect(input).toEqual(intentRequest);
      return intentResponse;
    });
    await expect(createServicePaymentIntent(intentRequest, adapter)).resolves.toEqual({
      ...intentResponse, providerId: "selected-gateway",
    });
    expect(adapter.createPaymentIntent).toHaveBeenCalledOnce();
  });

  it("rejects mismatched order totals, expired intents, and unapproved checkout origins", async () => {
    for (const response of [
      { ...intentResponse, grossRials: intentResponse.grossRials + 1 },
      { ...intentResponse, orderId: "c3f45b03-1758-4f8c-b590-b128a4a8feca" },
      { ...intentResponse, expiresAt: new Date(Date.now() - 1_000).toISOString() },
      { ...intentResponse, checkoutUrl: "https://attacker.example.test/session/token" },
      { ...intentResponse, checkoutUrl: "http://checkout.example.test/session/token" },
      { ...intentResponse, extra: "unexpected" },
    ]) {
      await expect(createServicePaymentIntent(intentRequest,
        intentAdapter(async () => response))).rejects
        .toBeInstanceOf(PaymentIntentBoundaryError);
    }
  });

  it("sanitizes provider errors and validates input before contacting the provider", async () => {
    const failing = intentAdapter(async () => { throw new Error("secret checkout token"); });
    await expect(createServicePaymentIntent(intentRequest, failing)).rejects
      .toMatchObject({ kind: "gateway_unavailable", message: "gateway_unavailable" });
    const create = vi.fn(async () => intentResponse);
    await expect(createServicePaymentIntent({ ...intentRequest, grossRials: 0 },
      intentAdapter(create))).rejects.toMatchObject({ kind: "request_invalid" });
    await expect(createServicePaymentIntent(intentRequest, {
      providerId: "Selected Gateway", allowedCheckoutOrigins,
      createPaymentIntent: create,
    })).rejects.toMatchObject({ kind: "request_invalid" });
    expect(create).not.toHaveBeenCalled();
  });
});

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
