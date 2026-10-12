import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, request, test } from "@playwright/test";
import { getDb } from "../../src/db";
import { memberships, user } from "../../src/db/schema";

const baseURL = "http://127.0.0.1:3000";
const testSms = "http://127.0.0.1:4317";
const token = process.env.DENA_SMS_GATEWAY_TOKEN;
const phone = `+989${String(randomInt(1_000_000_000)).padStart(9, "0")}`;

test.describe("verified mobile onboarding (disposable DB + SMS mock)", () => {
  test("requires a delivered OTP, never lets applicant choose a privileged role", async () => {
    if (process.env.DENA_DB_INTEGRATION !== "1" || !token) {
      throw new Error("DB + mock SMS required");
    }
    const browser = await request.newContext({ baseURL });
    try {
      const send = await browser.post("/api/auth/phone-number/send-otp", {
        data: { phoneNumber: phone },
      });
      expect(send.status()).toBe(200);

      const codeResponse = await fetch(
        `${testSms}/__test__/code?phone=${encodeURIComponent(phone)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(codeResponse.status).toBe(200);
      const { code } = await codeResponse.json() as { code: string };
      expect(code).toMatch(/^\d{6}$/);

      const immediateResend = await browser.post("/api/auth/phone-number/send-otp", {
        data: { phoneNumber: phone },
      });
      expect(immediateResend.status()).toBe(429);
      // A rejected resend must not invalidate the already delivered OTP.

      const invalid = await browser.post("/api/auth/phone-number/verify", {
        data: { phoneNumber: phone, code: "not-an-otp" },
      });
      expect(invalid.status()).not.toBe(200);

      const verified = await browser.post("/api/auth/phone-number/verify", {
        data: { phoneNumber: phone, code },
      });
      expect(verified.status()).toBe(200);

      // Authenticating a phone number grants no admin/institute/provider scope.
      expect((await browser.get("/api/access/me")).status()).toBe(401);
      const forged = await browser.post("/api/access/onboard", {
        data: { role: "admin" }, headers: { Origin: "http://localhost:3000" },
      });
      expect(forged.status()).toBe(400);

      const csrf = await browser.post("/api/access/onboard", {
        data: {}, headers: { Origin: "https://attacker.invalid" },
      });
      expect(csrf.status()).toBe(403);

      const onboard = await browser.post("/api/access/onboard", {
        data: {}, headers: { Origin: "http://localhost:3000" },
      });
      expect(onboard.status()).toBe(200);
      expect(await onboard.json()).toEqual({ role: "student", onboarded: true });

      const identity = await browser.get("/api/access/me");
      expect(identity.status()).toBe(200);
      const data = await identity.json();
      expect(data.memberships).toEqual([{ role: "student" }]);

      // Retrying onboarding is idempotent and never creates a second role.
      expect((await browser.post("/api/access/onboard", {
        data: {}, headers: { Origin: "http://localhost:3000" },
      })).status()).toBe(200);
      const records = await getDb().select().from(memberships)
        .where(eq(memberships.userId, data.userId));
      expect(records).toHaveLength(1);

      await getDb().update(memberships).set({ status: "revoked" })
        .where(eq(memberships.userId, data.userId));
      expect((await browser.post("/api/access/onboard", {
        data: {}, headers: { Origin: "http://localhost:3000" },
      })).status()).toBe(403);
      expect((await browser.get("/api/access/me")).status()).toBe(401);
      await getDb().delete(user).where(eq(user.id, data.userId));
    } finally {
      await browser.dispose();
    }
  });
});
