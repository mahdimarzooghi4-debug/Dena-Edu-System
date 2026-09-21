import { afterEach, describe, expect, it } from "vitest";
import {
  isCanonicalIranMobile, normalizeIranMobile, smsGatewayUrl, temporaryPhoneEmail,
} from "./phone";

const before = { ...process.env };
afterEach(() => {
  process.env.DENA_SMS_ENABLED = before.DENA_SMS_ENABLED;
  process.env.DENA_SMS_GATEWAY_URL = before.DENA_SMS_GATEWAY_URL;
  process.env.DENA_SMS_GATEWAY_TOKEN = before.DENA_SMS_GATEWAY_TOKEN;
  process.env.DENA_DB_INTEGRATION = before.DENA_DB_INTEGRATION;
  process.env.BETTER_AUTH_SECRET = before.BETTER_AUTH_SECRET;
});

describe("Iran mobile input and gateway safeguards", () => {
  it("normalizes Persian and Arabic digits for UI before sending to auth API", () => {
    expect(normalizeIranMobile("۰۹۱۲ ۱۲۳۴ ۵۶۷")).toBe("+989121234567");
    expect(normalizeIranMobile("٠٩١٢-١٢٣٤٥٦٧")).toBe("+989121234567");
    expect(normalizeIranMobile("+989121234567")).toBe("+989121234567");
    expect(isCanonicalIranMobile("09121234567")).toBe(false);
    expect(normalizeIranMobile("+98912123456")).toBeNull();
    expect(normalizeIranMobile("+9891212345678")).toBeNull();
    expect(normalizeIranMobile("+1234567890")).toBeNull();
  });

  it("uses a stable pseudonymous placeholder email, not plaintext phone", () => {
    process.env.BETTER_AUTH_SECRET = "a".repeat(64);
    const email = temporaryPhoneEmail("+989121234567");
    expect(email).toMatch(/^phone-[a-f0-9]{64}@phone\.dena\.example$/);
    expect(email).not.toContain("9121234567");
    expect(email).toBe(temporaryPhoneEmail("+989121234567"));
  });

  it("disallows missing gateway or remote plain HTTP even when enabled", () => {
    process.env.DENA_SMS_ENABLED = "0";
    expect(() => smsGatewayUrl()).toThrow();
    process.env.DENA_SMS_ENABLED = "1";
    process.env.DENA_SMS_GATEWAY_TOKEN = "x".repeat(32);
    process.env.DENA_SMS_GATEWAY_URL = "http://sms.example.test/send";
    process.env.DENA_DB_INTEGRATION = "0";
    expect(() => smsGatewayUrl()).toThrow();
    process.env.DENA_SMS_GATEWAY_URL = "https://sms.example.test/send";
    expect(smsGatewayUrl()).toBe("https://sms.example.test/send");
  });
});
