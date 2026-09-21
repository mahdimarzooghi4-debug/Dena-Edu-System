import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db";
import { account, session, user, verification } from "../db/schema";

function required(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured on the server`);
  return value;
}

export const auth = betterAuth({
  appName: "دنا",
  baseURL: required("BETTER_AUTH_URL"),
  secret: required("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  advanced: {
    database: { generateId: "uuid" },
  },
  session: {
    cookieCache: { enabled: false }, // immediate revocation checks matter
  },
  // No verified SMS or email provider has been selected. Do not expose public
  // credentials signup or assign roles from user-supplied identity fields.
  emailAndPassword: { enabled: false },
});
