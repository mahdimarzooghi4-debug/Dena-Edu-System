import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/release-preflight.mjs");
const good = {
  NODE_ENV: "production",
  DENA_DB_INTEGRATION: "0",
  DATABASE_URL: "postgresql://app:placeholder@db.example.com:5432/dena",
  BETTER_AUTH_URL: "https://dena.example.com",
  DENA_SMS_GATEWAY_URL: "https://sms.example.com/send",
  DENA_PRIVATE_MEDIA_ORIGIN_URL: "https://private-media.example.com/",
  DENA_MEDIA_ATTESTATION_KEY_ID: "production-scanner-v1",
  BETTER_AUTH_SECRET: "auth-" + "a".repeat(36),
  DENA_SMS_GATEWAY_TOKEN: "sms-" + "b".repeat(36),
  DENA_PRIVATE_MEDIA_ORIGIN_TOKEN: "origin-" + "c".repeat(36),
  DENA_MEDIA_PROCESSOR_TOKEN: "worker-" + "d".repeat(36),
  DENA_MEDIA_ATTESTATION_HMAC_KEY: "attest-" + "e".repeat(36),
  DENA_MEDIA_CLEANUP_TOKEN: "cleanup-" + "f".repeat(36),
  DENA_SMS_ENABLED: "1",
  DENA_MEDIA_ENABLED: "1",
  DENA_INGEST_ENABLED: "1",
  DENA_MEDIA_PROCESSOR_ENABLED: "1",
  DENA_MEDIA_ATTESTATION_ENABLED: "1",
  DENA_MEDIA_CLEANUP_ENABLED: "1",
};
function run(overrides: Record<string, string | undefined> = {}) {
  const env: NodeJS.ProcessEnv = { ...good, ...overrides };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key];
  }
  return spawnSync(process.execPath, [script], {
    env, encoding: "utf8", timeout: 5_000,
  });
}

describe("release preflight only validates static configuration", () => {
  it("passes the synthetic independent HTTPS secrets fixture without claiming release safety", () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("NOT PRODUCTION APPROVAL");
    expect(result.stdout).toContain("human gates");
    expect(result.stderr).toBe("");
  });

  it("fails closed on CI mode, localhost SMS or HTTP private origin, without printing values", () => {
    const result = run({
      DENA_DB_INTEGRATION: "1",
      BETTER_AUTH_URL: "http://localhost:3000",
      DENA_SMS_GATEWAY_URL: "http://127.0.0.1:4317/send",
      DENA_PRIVATE_MEDIA_ORIGIN_URL: "http://127.0.0.1:4318/",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DENA_DB_INTEGRATION:ci_mock_forbidden");
    expect(result.stderr).toContain("DENA_SMS_GATEWAY_URL:insecure_protocol");
    expect(result.stderr).toContain("DENA_PRIVATE_MEDIA_ORIGIN_URL:insecure_protocol");
    expect(result.stderr).not.toContain("127.0.0.1");
    expect(result.stderr).not.toContain(good.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN);
  });

  it("denies reused worker/attestation secrets and missing encryption material", () => {
    const result = run({
      DENA_MEDIA_ATTESTATION_HMAC_KEY: good.DENA_MEDIA_PROCESSOR_TOKEN,
      DENA_MEDIA_CLEANUP_TOKEN: undefined,
      BETTER_AUTH_SECRET: "short",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "DENA_MEDIA_PROCESSOR_TOKEN+DENA_MEDIA_ATTESTATION_HMAC_KEY:reused_secret",
    );
    expect(result.stderr).toContain("DENA_MEDIA_CLEANUP_TOKEN:missing_or_short");
    expect(result.stderr).toContain("BETTER_AUTH_SECRET:missing_or_short");
    expect(result.stderr).not.toContain(good.DENA_MEDIA_PROCESSOR_TOKEN);
  });

  it("rejects development mode, disabled services and origins with credentials or query", () => {
    const result = run({
      NODE_ENV: "development",
      DENA_MEDIA_ATTESTATION_ENABLED: "0",
      DENA_SMS_ENABLED: "0",
      DENA_PRIVATE_MEDIA_ORIGIN_URL: "https://u:p@origin.example.com/?x=1",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NODE_ENV:not_production");
    expect(result.stderr).toContain("DENA_SMS_ENABLED:not_enabled");
    expect(result.stderr).toContain("DENA_MEDIA_ATTESTATION_ENABLED:not_enabled");
    expect(result.stderr).toContain("DENA_PRIVATE_MEDIA_ORIGIN_URL:unexpected_url_parts");
    expect(result.stderr).not.toContain("u:p");
  });
});
