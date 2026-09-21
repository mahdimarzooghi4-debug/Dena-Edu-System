import { defineConfig } from "drizzle-kit";

// Drizzle CLI receives DATABASE_URL from its environment. Never embed secrets
// or rely on a production fallback URI in source control.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
