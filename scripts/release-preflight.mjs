/**
 * Static configuration preflight ONLY: it does not prove that SMS works,
 * storage is private/immutable, malware scanning exists, or capacity is safe.
 * Prints variable NAMES / error codes, NEVER configuration values or secrets.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const flags = [
  "DENA_SMS_ENABLED",
  "DENA_MEDIA_ENABLED",
  "DENA_INGEST_ENABLED",
  "DENA_MEDIA_PROCESSOR_ENABLED",
  "DENA_MEDIA_ATTESTATION_ENABLED",
  "DENA_MEDIA_CLEANUP_ENABLED",
];
const secrets = [
  "BETTER_AUTH_SECRET",
  "DENA_SMS_GATEWAY_TOKEN",
  "DENA_PRIVATE_MEDIA_ORIGIN_TOKEN",
  "DENA_MEDIA_PROCESSOR_TOKEN",
  "DENA_MEDIA_ATTESTATION_HMAC_KEY",
  "DENA_MEDIA_CLEANUP_TOKEN",
];
const lengths = {
  BETTER_AUTH_SECRET: 32,
  DENA_SMS_GATEWAY_TOKEN: 16,
  DENA_PRIVATE_MEDIA_ORIGIN_TOKEN: 16,
  DENA_MEDIA_PROCESSOR_TOKEN: 32,
  DENA_MEDIA_ATTESTATION_HMAC_KEY: 32,
  DENA_MEDIA_CLEANUP_TOKEN: 32,
};
function isLocal(hostname) {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" ||
    h.endsWith(".localhost") || h.endsWith(".test") || h.endsWith(".invalid");
}
function checkUrl(value, label, { root = false, protocols = ["https:"] } = {}) {
  if (!value) return [label + ":missing"];
  let parsed;
  try { parsed = new URL(value); } catch { return [label + ":invalid_url"]; }
  if (!protocols.includes(parsed.protocol)) return [label + ":insecure_protocol"];
  if (isLocal(parsed.hostname)) return [label + ":mock_or_loopback"];
  if (parsed.username || parsed.password || parsed.hash || parsed.search ||
      (root && parsed.pathname !== "/")) return [label + ":unexpected_url_parts"];
  return [];
}

/**
 * Do not require multipart planning: it is an inert dry-run, not an uploader.
 * No assertion of real-world readiness follows from an empty blockers list.
 */
export function assessReleaseEnvironment(env) {
  const blockers = [];
  if (env.DENA_DB_INTEGRATION && env.DENA_DB_INTEGRATION !== "0") {
    blockers.push("DENA_DB_INTEGRATION:ci_mock_forbidden");
  }
  if (env.NODE_ENV !== "production") blockers.push("NODE_ENV:not_production");
  if (!env.DATABASE_URL) blockers.push("DATABASE_URL:missing");
  else {
    try {
      const db = new URL(env.DATABASE_URL);
      if (!["postgresql:", "postgres:"].includes(db.protocol)) {
        blockers.push("DATABASE_URL:invalid_protocol");
      }
      if (!db.hostname) blockers.push("DATABASE_URL:missing_host");
      else if (isLocal(db.hostname)) blockers.push("DATABASE_URL:mock_or_loopback");
      if (!db.pathname || db.pathname === "/") blockers.push("DATABASE_URL:missing_database");
      if (db.hash || db.searchParams.has("host") || db.searchParams.has("ssl")) {
        blockers.push("DATABASE_URL:ambiguous_connection_options");
      }
      // Postgres.js consumes sslmode from the URL. "require" encrypts but
      // does not promise hostname verification; fail closed unless the app
      // explicitly requests authenticated TLS for the database hostname.
      const modes = db.searchParams.getAll("sslmode");
      if (modes.length !== 1 || modes[0] !== "verify-full") {
        blockers.push("DATABASE_URL:tls_verification_required");
      }
    } catch { blockers.push("DATABASE_URL:invalid_url"); }
  }
  blockers.push(...checkUrl(env.BETTER_AUTH_URL, "BETTER_AUTH_URL"));
  blockers.push(...checkUrl(env.DENA_SMS_GATEWAY_URL, "DENA_SMS_GATEWAY_URL"));
  blockers.push(...checkUrl(env.DENA_PRIVATE_MEDIA_ORIGIN_URL,
    "DENA_PRIVATE_MEDIA_ORIGIN_URL", { root: true }));
  for (const flag of flags) {
    if (env[flag] !== "1") blockers.push(flag + ":not_enabled");
  }
  for (const secret of secrets) {
    if (!env[secret] || env[secret].length < lengths[secret]) {
      blockers.push(secret + ":missing_or_short");
    }
  }
  const keyId = env.DENA_MEDIA_ATTESTATION_KEY_ID;
  if (!keyId || !/^[a-zA-Z0-9._-]{3,100}$/.test(keyId)) {
    blockers.push("DENA_MEDIA_ATTESTATION_KEY_ID:invalid");
  }
  // A shared secret between logically separated workers/origins defeats
  // independent attestation. Do not print any secret or its fingerprint.
  for (let i = 0; i < secrets.length; i++) {
    for (let j = i + 1; j < secrets.length; j++) {
      if (env[secrets[i]] && env[secrets[i]] === env[secrets[j]]) {
        blockers.push(secrets[i] + "+" + secrets[j] + ":reused_secret");
      }
    }
  }
  return blockers;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const blockers = assessReleaseEnvironment(process.env);
  if (blockers.length) {
    console.error("Dena static release config: BLOCKED");
    for (const code of blockers) console.error("- " + code);
    process.exitCode = 1;
  } else {
    console.log("Dena static release config: CHECKS PASSED (NOT PRODUCTION APPROVAL)");
    console.log("Required human gates: real SMS/vendor and storage verification,");
    console.log("isolated AV/transcoder, immutable private objects, secrets,");
    console.log("DB backup/restore, role/legal review, edge auth and load testing.");
  }
}
