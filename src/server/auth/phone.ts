import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { getDb } from "../../db";
import { otpDispatchLimits } from "../../db/schema";

export const IRAN_MOBILE = /^\+989\d{9}$/;

export function normalizeIranMobile(input: string): string | null {
  const ascii = input.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code >= 0x6f0 && code <= 0x6f9 ? code - 0x6f0 : code - 0x660);
  }).replace(/[\s-]/g, "");
  const canonical = ascii.startsWith("09") ? "+98" + ascii.slice(1) : ascii;
  return IRAN_MOBILE.test(canonical) ? canonical : null;
}

export function isCanonicalIranMobile(value: string): boolean {
  return IRAN_MOBILE.test(value);
}

function hmacPhone(phone: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be 32+ characters");
  return createHmac("sha256", secret).update(phone).digest("hex");
}

/** Pseudonymous, non-deliverable email for the phone-only Better Auth core user. */
export function temporaryPhoneEmail(phone: string): string {
  return `phone-${hmacPhone(phone)}@phone.dena.example`;
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
  const url = new URL(value);
  const localTest = process.env.DENA_DB_INTEGRATION === "1" &&
    url.protocol === "http:" && url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !localTest) {
    throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS gateway requires HTTPS" });
  }
  return value;
}

/** Atomically enforce a 60-second cooldown and three sends per rolling hour
 * per HMAC(phone). Multiple Next.js replicas share the same PostgreSQL limit.
 */
async function takeDispatchSlot(phone: string) {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60_000);
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const hash = hmacPhone(phone);
  const [allowed] = await getDb().insert(otpDispatchLimits).values({
    phoneHash: hash, lastSentAt: now, windowStartedAt: now, count: 1,
  }).onConflictDoUpdate({
    target: otpDispatchLimits.phoneHash,
    set: {
      lastSentAt: now,
      windowStartedAt: sql`CASE WHEN ${otpDispatchLimits.windowStartedAt} <= ${hourAgo} THEN ${now} ELSE ${otpDispatchLimits.windowStartedAt} END`,
      count: sql`CASE WHEN ${otpDispatchLimits.windowStartedAt} <= ${hourAgo} THEN 1 ELSE ${otpDispatchLimits.count} + 1 END`,
    },
    setWhere: sql`${otpDispatchLimits.lastSentAt} <= ${minuteAgo} AND
      (${otpDispatchLimits.windowStartedAt} <= ${hourAgo} OR ${otpDispatchLimits.count} < 3)`,
  }).returning({ phoneHash: otpDispatchLimits.phoneHash });
  if (!allowed) throw new APIError("TOO_MANY_REQUESTS", { message: "OTP request limit reached" });
}

/** Provider-neutral JSON gateway contract; vendor mapping remains in this adapter. */
export async function sendSmsOtp(phoneNumber: string, code: string): Promise<void> {
  if (!isCanonicalIranMobile(phoneNumber) || !/^\d{6}$/.test(code)) {
    throw new APIError("BAD_REQUEST", { message: "Invalid phone or OTP format" });
  }
  const url = smsGatewayUrl(); // fail closed before consuming phone quota
  await takeDispatchSlot(phoneNumber);
  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DENA_SMS_GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({ phoneNumber, code, purpose: "dena-login" }),
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
  if (!result.ok) {
    // Never log code, phone, token, response body or gateway URL.
    throw new APIError("SERVICE_UNAVAILABLE", { message: "SMS delivery temporarily unavailable" });
  }
}
