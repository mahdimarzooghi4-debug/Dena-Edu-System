import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: process.env.DENA_DB_INTEGRATION === "1" ? [] : ["**/access-db.spec.ts", "**/phone-otp-db.spec.ts", "**/login-ui-db.spec.ts", "**/role-applications-db.spec.ts", "**/course-supervision-db.spec.ts", "**/student-private-media-db.spec.ts", "**/student-learning-assessment-db.spec.ts", "**/media-ingest-db.spec.ts", "**/course-team-communications-db.spec.ts", "**/provider-collaborations-db.spec.ts", "**/technical-support-db.spec.ts"],
  use: { baseURL: "http://127.0.0.1:3000", ...devices["Desktop Chrome"] },
  webServer: {
    command: process.env.CI
      ? "npm run start -- --hostname 127.0.0.1"
      : "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
