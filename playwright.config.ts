import { defineConfig, devices } from "@playwright/test";

process.env.LIVEKIT_URL ??= "wss://calls.example.test";
process.env.LIVEKIT_API_KEY ??= "dena-playwright-test-key";
process.env.LIVEKIT_API_SECRET ??= "playwright-only-livekit-secret-32-bytes-minimum";
process.env.DENA_LIVEKIT_ENABLED ??= "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: process.env.DENA_DB_INTEGRATION === "1" ? [] : [
    "**/access-db.spec.ts",
    "**/phone-otp-db.spec.ts",
    "**/login-ui-db.spec.ts",
    "**/role-applications-db.spec.ts",
    "**/course-supervision-db.spec.ts",
    "**/student-private-media-db.spec.ts",
    "**/dena-ai-content-permissions-db.spec.ts",
    "**/student-learning-assessment-db.spec.ts",
    "**/media-ingest-db.spec.ts",
    "**/course-team-communications-db.spec.ts",
    "**/provider-collaborations-db.spec.ts",
    "**/independent-educator-affiliations-db.spec.ts",
    "**/technical-support-db.spec.ts",
    "**/institute-service-orders-db.spec.ts",
    "**/organization-panel-analytics-db.spec.ts",
    "**/health-db.spec.ts",
    "**/admin-media-operations-db.spec.ts",
  ],
  use: { baseURL: "http://127.0.0.1:3000", ...devices["Desktop Chrome"] },
  webServer: {
    command: process.env.CI && process.env.DENA_DB_INTEGRATION === "1"
      ? "npm run start -- --hostname 127.0.0.1"
      : "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
