import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/release-preflight.mjs");
const good = {
  NODE_ENV: "production",
  DENA_DB_INTEGRATION: "0",
  DATABASE_URL: "postgresql://app:placeholder@db.example.com:5432/dena?sslmode=verify-full",
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
  const env = { ...good, ...overrides } as NodeJS.ProcessEnv;
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

  it.each([
    ["absent TLS mode", "postgresql://app:db-secret@db.example.com:5432/dena", "tls_verification_required"],
    ["unencrypted", "postgresql://app:db-secret@db.example.com:5432/dena?sslmode=disable", "tls_verification_required"],
    ["encryption without hostname validation", "postgresql://app:db-secret@db.example.com:5432/dena?sslmode=require", "tls_verification_required"],
    ["CA check without hostname validation", "postgresql://app:db-secret@db.example.com:5432/dena?sslmode=verify-ca", "tls_verification_required"],
    ["duplicated mode", "postgresql://app:db-secret@db.example.com:5432/dena?sslmode=verify-full&sslmode=disable", "tls_verification_required"],
    ["ambiguous SSL override", "postgresql://app:db-secret@db.example.com:5432/dena?sslmode=verify-full&ssl=false", "ambiguous_connection_options"],
    ["host override", "postgresql://app:db-secret@db.example.com:5432/dena?sslmode=verify-full&host=localhost", "ambiguous_connection_options"],
    ["local database", "postgresql://app:db-secret@127.0.0.1:5432/dena?sslmode=verify-full", "mock_or_loopback"],
    ["alternate loopback", "postgresql://app:db-secret@127.0.0.2:5432/dena?sslmode=verify-full", "mock_or_loopback"],
    ["IPv6 loopback", "postgresql://app:db-secret@[::1]:5432/dena?sslmode=verify-full", "mock_or_loopback"],
    ["missing database", "postgresql://app:db-secret@db.example.com:5432/?sslmode=verify-full", "missing_database"],
  ])("rejects %s for full release without logging database credentials", (_case, databaseUrl, code) => {
    const result = run({ DATABASE_URL: databaseUrl });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DATABASE_URL:" + code);
    expect(result.stderr).not.toContain("db-secret");
    expect(result.stderr).not.toContain(databaseUrl);
  });

  it("requires explicit production mode and rejects nonnumeric mock toggles", () => {
    const result = run({ NODE_ENV: undefined, DENA_DB_INTEGRATION: "true" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NODE_ENV:not_production");
    expect(result.stderr).toContain("DENA_DB_INTEGRATION:ci_mock_forbidden");
  });

  it("blocks globally disabled TLS certificate validation", () => {
    const result = run({ NODE_TLS_REJECT_UNAUTHORIZED: "0" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NODE_TLS_REJECT_UNAUTHORIZED:certificate_validation_disabled");
  });

  it.each([
    ["SMS link-local IPv4", "DENA_SMS_GATEWAY_URL", "https://169.254.169.254/send"],
    ["media link-local IPv6", "DENA_PRIVATE_MEDIA_ORIGIN_URL", "https://[fe80::1]/"],
    ["auth trailing-dot localhost", "BETTER_AUTH_URL", "https://localhost./"],
    ["media loopback HTTPS", "DENA_PRIVATE_MEDIA_ORIGIN_URL", "https://127.0.0.3/"],
  ])("rejects %s in static release config without echoing destinations",
    (_case, key, value) => {
      const result = run({ [key]: value });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(key + ":mock_or_loopback");
      expect(result.stderr).not.toContain(value);
    });

  it("rejects alternate loopback for HTTPS service URLs", () => {
    const result = run({ DENA_SMS_GATEWAY_URL: "https://[::1]/send" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DENA_SMS_GATEWAY_URL:mock_or_loopback");
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
