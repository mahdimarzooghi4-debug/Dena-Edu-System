import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db";
import { account, rateLimit, session, user, verification } from "../db/schema";
import { isCanonicalIranMobile, reserveOtpDispatch, sendSmsOtp, smsGatewayUrl, temporaryPhoneEmail } from "../server/auth/phone";

function required(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured on the server`);
  return value;
}

function createAuth() {
  return betterAuth({
    appName: "دنا",
    baseURL: required("BETTER_AUTH_URL"),
    secret: required("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user, session, account, verification, rateLimit },
    }),
    advanced: {
      database: { generateId: "uuid" },
    },
    session: {
      cookieCache: { enabled: false }, // immediate revocation checks matter
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/phone-number/send-otp") return;
        const body = ctx.body as { phoneNumber?: unknown } | undefined;
        if (typeof body?.phoneNumber !== "string" ||
            !isCanonicalIranMobile(body.phoneNumber)) {
          throw new APIError("BAD_REQUEST", { message: "Canonical Iranian mobile required" });
        }
        smsGatewayUrl(); // fail closed before code generation and quota write
        await reserveOtpDispatch(body.phoneNumber);
      }),
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 40,
      customRules: {
        "/phone-number/send-otp": { window: 60, max: 5 },
        "/phone-number/verify": { window: 60, max: 8 },
      },
    },
    plugins: [phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      phoneNumberValidator: isCanonicalIranMobile,
      sendOTP: async ({ phoneNumber, code }) => sendSmsOtp(phoneNumber, code),
      signUpOnVerification: {
        getTempEmail: temporaryPhoneEmail,
        getTempName: () => "کاربر دنا",
      },
    })],
    // Registration only after verified phone; no public credential signup.
    // Verified identity is NOT an elevated membership.
    emailAndPassword: { enabled: false },
  });
}

// Do not require production secrets during Next.js build/preview route discovery.
// Fail closed when a live auth request actually reaches this integration.
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
