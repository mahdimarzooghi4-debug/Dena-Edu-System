import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { getDb } from "../../db";
import { otpDispatchLimits } from "../../db/schema";
import { isCanonicalIranMobile } from "../../lib/phone-number";
export { normalizeIranMobile, isCanonicalIranMobile } from "../../lib/phone-number";

function hmacPhone(phone: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be 32+ characters");
  return createHmac("sha256", secret).update(phone).digest("hex");
}

/** Pseudonymous, non-deliverable email for the phone-only Better Auth core user. */
export function temporaryPhoneEmail(phone: string): string {
  return `phone-${hmacPhone(phone)}@phone.dena.example`;
}

/**
 * Reject obviously unsafe literal destinations even when they use HTTPS.
 * This is not a DNS-rebinding defence: production egress and vendor allowlists
 * must also constrain where the server can actually connect.
 */
function unsafeGatewayHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host.endsWith(".localhost") ||
    host === "::1" || host === "::" || host.startsWith("::ffff:") ||
    host === "0.0.0.0" ||
    /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host) ||
    /^169\.254\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host);
}

export function smsGatewayUrl(): string {
  if (process.env.DENA_SMS_ENABLED !== "1") {
    throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS delivery is not configured" });
  }
  const value = process.env.DENA_SMS_GATEWAY_URL;
  const token = process.env.DENA_SMS_GATEWAY_TOKEN;
  if (!value || !token || token.length < 16) {
    throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS delivery is not configured" });
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Do not include the configured URL: it might contain a vendor credential.
    throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS delivery is not configured" });
  }
  const localTest = process.env.DENA_DB_INTEGRATION === "1" &&
    url.protocol === "http:" && url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !localTest) || !url.hostname ||
      (!localTest && unsafeGatewayHost(url.hostname)) ||
      url.username || url.password || url.hash || url.search) {
    throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS gateway URL is not allowed" });
  }
  return url.href;
}

/** Atomically enforce a 60-second cooldown and three sends per one-hour window from first send
 * per HMAC(phone). Multiple Next.js replicas share the same PostgreSQL limit.
 */
export async function reserveOtpDispatch(phone: string) {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60_000);
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const hourAgoIso = hourAgo.toISOString();
  const minuteAgoIso = minuteAgo.toISOString();
  const nowIso = now.toISOString();
  const hash = hmacPhone(phone);
  const [allowed] = await getDb().insert(otpDispatchLimits).values({
    phoneHash: hash, lastSentAt: now, windowStartedAt: now, count: 1,
  }).onConflictDoUpdate({
    target: otpDispatchLimits.phoneHash,
    set: {
      lastSentAt: now,
      windowStartedAt: sql`CASE WHEN ${otpDispatchLimits.windowStartedAt} <= ${hourAgoIso} THEN ${nowIso} ELSE ${otpDispatchLimits.windowStartedAt} END`,
      count: sql`CASE WHEN ${otpDispatchLimits.windowStartedAt} <= ${hourAgoIso} THEN 1 ELSE ${otpDispatchLimits.count} + 1 END`,
    },
    setWhere: sql`${otpDispatchLimits.lastSentAt} <= ${minuteAgoIso} AND
      (${otpDispatchLimits.windowStartedAt} <= ${hourAgoIso} OR ${otpDispatchLimits.count} < 3)`,
  }).returning({ phoneHash: otpDispatchLimits.phoneHash });
  if (!allowed) throw new APIError("TOO_MANY_REQUESTS", { message: "OTP request limit reached" });
}

/** Provider-neutral JSON gateway contract. Caller must reserve quota BEFORE
 * Better Auth generates/replaces the OTP, not here after code generation.
 */
export async function sendSmsOtp(phoneNumber: string, code: string): Promise<void> {
  if (!isCanonicalIranMobile(phoneNumber) || !/^\d{6}$/.test(code)) {
    throw new APIError("BAD_REQUEST", { message: "Invalid phone or OTP format" });
  }
  const url = smsGatewayUrl(); // fail closed before consuming phone quota
  try {
    const result = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DENA_SMS_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ phoneNumber, code, purpose: "dena-login" }),
      // A 307/308 can replay the OTP body to another origin. Never follow any
      // vendor redirect, even if the destination also uses HTTPS.
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (result.ok) return;
  } catch {
    // Do not propagate fetch/URL/redirect errors: they can embed an OTP,
    // phone number, gateway URL or credential in an upstream error message.
  }
  throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS delivery temporarily unavailable" });
}
