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

export const servicePaymentIntentRequest = z.object({
  orderId: z.uuid(),
  grossRials: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  currency: z.literal("IRR"),
  idempotencyKey: z.uuid(),
}).strict();
export type ServicePaymentIntentRequest = z.infer<typeof servicePaymentIntentRequest>;

const verifiedServicePaymentIntent = z.object({
  providerIntentId: z.string().regex(/^[A-Za-z0-9._:-]{8,200}$/),
  orderId: z.uuid(),
  grossRials: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  currency: z.literal("IRR"),
  checkoutUrl: z.string().url(),
  expiresAt: z.string().datetime(),
}).strict();
export type VerifiedServicePaymentIntent = z.infer<typeof verifiedServicePaymentIntent>;

export interface ServicePaymentIntentAdapter {
  /** Stable, non-secret provider namespace. */
  readonly providerId: string;
  /** HTTPS origins that the browser is permitted to visit for checkout. */
  readonly allowedCheckoutOrigins: ReadonlySet<string>;
  createPaymentIntent(input: ServicePaymentIntentRequest): Promise<unknown>;
}

export class PaymentIntentBoundaryError extends Error {
  constructor(readonly kind:
    "request_invalid" | "gateway_unavailable" | "intent_invalid") {
    super(kind);
  }
}

function validCheckoutOrigins(origins: ReadonlySet<string>): boolean {
  return origins instanceof Set && origins.size > 0 && [...origins].every((origin) => {
    try {
      const url = new URL(origin);
      return url.protocol === "https:" && url.origin === origin &&
        !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
    } catch { return false; }
  });
}

/** Starts a vendor-neutral checkout using server-derived order data. The
 * caller must load and authorize the payable order before calling this helper.
 * The adapter must forward the idempotency key to the provider and normalize
 * only the provider's checkout reference, URL, and expiry.
 */
export async function createServicePaymentIntent(
  input: ServicePaymentIntentRequest,
  adapter: ServicePaymentIntentAdapter,
  now = Date.now(),
): Promise<VerifiedServicePaymentIntent & { providerId: string }> {
  const request = servicePaymentIntentRequest.safeParse(input);
  if (!request.success || !adapter ||
      !providerIdPattern.test(adapter.providerId) ||
      !validCheckoutOrigins(adapter.allowedCheckoutOrigins)) {
    throw new PaymentIntentBoundaryError("request_invalid");
  }

  let rawIntent: unknown;
  try {
    rawIntent = await adapter.createPaymentIntent(request.data);
  } catch {
    // Provider errors may contain checkout tokens, payloads or secrets.
    throw new PaymentIntentBoundaryError("gateway_unavailable");
  }
  const parsed = verifiedServicePaymentIntent.safeParse(rawIntent);
  if (!parsed.success ||
      parsed.data.orderId !== request.data.orderId ||
      parsed.data.grossRials !== request.data.grossRials ||
      parsed.data.currency !== request.data.currency ||
      Date.parse(parsed.data.expiresAt) <= now) {
    throw new PaymentIntentBoundaryError("intent_invalid");
  }
  let checkout: URL;
  try { checkout = new URL(parsed.data.checkoutUrl); }
  catch { throw new PaymentIntentBoundaryError("intent_invalid"); }
  if (checkout.protocol !== "https:" ||
      !adapter.allowedCheckoutOrigins.has(checkout.origin) ||
      !!checkout.username || !!checkout.password || !!checkout.hash) {
    throw new PaymentIntentBoundaryError("intent_invalid");
  }
  return { ...parsed.data, providerId: adapter.providerId };
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
