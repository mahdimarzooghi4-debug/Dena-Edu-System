import { z } from "zod";
import {
  captureInstituteServiceOrderPayment,
  type InstituteServicePaymentCaptureInput,
} from "./service-order-payments";

/** A provider adapter must authenticate the untouched request bytes, enforce
 * its signature/replay rules, and only then return this normalized event.
 * Browser redirects, client callbacks, and unverified provider payloads do not
 * satisfy this contract.
 */
export const verifiedPaymentCapture = z.object({
  eventId: z.string().regex(/^[A-Za-z0-9._:-]{8,100}$/),
  orderId: z.uuid(),
  grossRials: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  currency: z.literal("IRR"),
  state: z.literal("captured"),
}).strict();

export type VerifiedPaymentCapture = z.infer<typeof verifiedPaymentCapture>;

export interface ServicePaymentGatewayAdapter {
  /** Stable, non-secret provider namespace used to prevent event-ID clashes. */
  readonly providerId: string;
  verifyWebhook(input: {
    headers: Headers;
    rawBody: Uint8Array;
  }): Promise<unknown | null>;
}

export class PaymentGatewayBoundaryError extends Error {
  constructor(readonly kind:
    "request_invalid" | "gateway_unavailable" | "event_unverified" | "event_invalid") {
    super(kind);
  }
}

const providerIdPattern = /^[a-z][a-z0-9._-]{1,30}$/;
const MAX_PAYMENT_WEBHOOK_BYTES = 64 * 1024;

type CapturePayment = (input: InstituteServicePaymentCaptureInput) => Promise<unknown>;

/** Vendor-neutral verified-webhook boundary. A concrete provider adapter is
 * intentionally not configured until its API/signature contract is selected.
 */
export async function handleServicePaymentWebhook(
  input: { headers: Headers; rawBody: Uint8Array },
  adapter: ServicePaymentGatewayAdapter,
  capture: CapturePayment = captureInstituteServiceOrderPayment,
) {
  if (!input || !(input.headers instanceof Headers) ||
      !(input.rawBody instanceof Uint8Array) || input.rawBody.byteLength < 1 ||
      input.rawBody.byteLength > MAX_PAYMENT_WEBHOOK_BYTES ||
      !adapter || !providerIdPattern.test(adapter.providerId)) {
    throw new PaymentGatewayBoundaryError("request_invalid");
  }

  let event: unknown;
  try {
    event = await adapter.verifyWebhook({
      headers: input.headers,
      rawBody: input.rawBody,
    });
  } catch {
    // Provider errors may contain request bodies, signatures or secrets.
    throw new PaymentGatewayBoundaryError("gateway_unavailable");
  }
  if (event === null) throw new PaymentGatewayBoundaryError("event_unverified");
  const parsed = verifiedPaymentCapture.safeParse(event);
  if (!parsed.success) throw new PaymentGatewayBoundaryError("event_invalid");

  return capture({
    orderId: parsed.data.orderId,
    gatewayEventId: `${adapter.providerId}:${parsed.data.eventId}`,
    grossRials: parsed.data.grossRials,
  });
}
