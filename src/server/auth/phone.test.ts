import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isCanonicalIranMobile, normalizeIranMobile, sendSmsOtp, smsGatewayUrl, temporaryPhoneEmail,
} from "./phone";

const before = { ...process.env };
afterEach(() => {
  vi.unstubAllGlobals();
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

  it.each([
    "not-a-url",
    "https://user:pass@sms.example.test/send",
    "https://sms.example.test/send?token=unsafe",
    "https://sms.example.test/send#fragment",
    "http://localhost:4317/send",
  ])("rejects malformed or unsafe SMS gateway URLs without echoing config", (value) => {
    process.env.DENA_SMS_ENABLED = "1";
    process.env.DENA_SMS_GATEWAY_TOKEN = "t".repeat(32);
    process.env.DENA_DB_INTEGRATION = "0";
    process.env.DENA_SMS_GATEWAY_URL = value;
    expect(() => smsGatewayUrl()).toThrow();
    try {
      smsGatewayUrl();
    } catch (error) {
      expect(String(error)).not.toContain(value);
      expect(String(error)).not.toContain("pass");
    }
  });

  it("sends only the approved OTP payload and refuses to follow redirects", async () => {
    process.env.DENA_SMS_ENABLED = "1";
    process.env.DENA_SMS_GATEWAY_URL = "https://sms.example.test/send";
    process.env.DENA_SMS_GATEWAY_TOKEN = "token-" + "z".repeat(32);
    process.env.DENA_DB_INTEGRATION = "0";
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSmsOtp("+989121234567", "123456");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("https://sms.example.test/send",
      expect.objectContaining({
        method: "POST", redirect: "error", cache: "no-store",
        headers: expect.objectContaining({
          Authorization: `Bearer ${process.env.DENA_SMS_GATEWAY_TOKEN}`,
        }),
      }));
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      phoneNumber: "+989121234567", code: "123456", purpose: "dena-login",
    });
  });

  it("does not treat 307 redirects as delivery or reveal OTP on transport errors", async () => {
    process.env.DENA_SMS_ENABLED = "1";
    process.env.DENA_SMS_GATEWAY_URL = "https://sms.example.test/send";
    process.env.DENA_SMS_GATEWAY_TOKEN = "token-" + "z".repeat(32);
    process.env.DENA_DB_INTEGRATION = "0";
    const fetchMock = vi.fn(async () =>
      new Response(null, { status: 307, headers: { Location: "https://other.example.test/collect" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendSmsOtp("+989121234567", "123456"))
      .rejects.toThrow("SMS delivery temporarily unavailable");
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRejectedValueOnce(new Error("123456 +989121234567 secret-vendor-response"));
    await expect(sendSmsOtp("+989121234567", "123456"))
      .rejects.toThrow("SMS delivery temporarily unavailable");
  });

  it.each([
    "https://localhost/send",
    "https://localhost./send",
    "https://sms.localhost/send",
    "https://127.0.0.2/send",
    "https://[::1]/send",
    "https://[::ffff:127.0.0.1]/send",
    "https://0.0.0.0/send",
    "https://169.254.169.254/latest/meta-data",
    "https://[fe80::1]/send",
  ])("refuses HTTPS SMS requests to obvious local addresses: %s", (url) => {
    process.env.DENA_SMS_ENABLED = "1";
    process.env.DENA_SMS_GATEWAY_TOKEN = "s".repeat(32);
    process.env.DENA_DB_INTEGRATION = "0";
    process.env.DENA_SMS_GATEWAY_URL = url;
    expect(() => smsGatewayUrl()).toThrow("SMS gateway URL is not allowed");
  });

  it("with real local HTTP servers never forwards OTP data to a 307 redirect target", async () => {
    let targetHits = 0;
    let gatewayHits = 0;
    let received = "";
    const target = createServer((_req, res) => {
      targetHits++;
      res.writeHead(204);
      res.end();
    });
    const listen = (server: ReturnType<typeof createServer>) =>
      new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", reject);
          const addr = server.address();
          if (!addr || typeof addr === "string") reject(new Error("Missing mock port"));
          else resolve(addr.port);
        });
      });
    const targetPort = await listen(target);
    const gateway = createServer(async (req, res) => {
      gatewayHits++;
      for await (const chunk of req) received += chunk.toString();
      res.writeHead(307, { Location: `http://127.0.0.1:${targetPort}/steal` });
      res.end();
    });
    try {
      const gatewayPort = await listen(gateway);
      process.env.DENA_DB_INTEGRATION = "1";
      process.env.DENA_SMS_ENABLED = "1";
      process.env.DENA_SMS_GATEWAY_URL = `http://127.0.0.1:${gatewayPort}/send`;
      process.env.DENA_SMS_GATEWAY_TOKEN = "test-" + "k".repeat(32);
      await expect(sendSmsOtp("+989121234567", "123456"))
        .rejects.toThrow("SMS delivery temporarily unavailable");
      expect(gatewayHits).toBe(1);
      expect(JSON.parse(received)).toEqual({
        phoneNumber: "+989121234567", code: "123456", purpose: "dena-login",
      });
      expect(targetHits).toBe(0);
    } finally {
      await Promise.all([gateway, target].map(server =>
        new Promise<void>((resolve, reject) =>
          server.close(error => error ? reject(error) : resolve()))));
    }
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
