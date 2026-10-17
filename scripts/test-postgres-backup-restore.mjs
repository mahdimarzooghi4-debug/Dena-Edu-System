#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const integrationUrl = process.env.DATABASE_URL;
if (process.env.DENA_DB_INTEGRATION !== "1" || !integrationUrl) {
  throw new Error("Backup/restore verification is restricted to disposable integration databases.");
}

const url = new URL(integrationUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(url.hostname) ||
  decodeURIComponent(url.pathname.slice(1)) !== "dena_integration" ||
  decodeURIComponent(url.username) !== "dena_test"
) {
  throw new Error("Refusing backup/restore: expected the local dena_test/dena_integration CI database.");
}

const environment = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: "dena_integration",
};

function run(command, args, { database } = {}) {
  const result = spawnSync(command, args, {
    env: database ? { ...environment, PGDATABASE: database } : environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

const suffix = randomBytes(6).toString("hex");
const probeSchema = `restore_probe_${suffix}`;
const restoredDatabase = `dena_restore_${suffix}`;
const backupDirectory = mkdtempSync(join(tmpdir(), "dena-postgres-restore-"));
const archive = join(backupDirectory, "dena-integration.dump");
let targetCreated = false;
let probeCreated = false;
let failure;

try {
  run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", archive]);
  run("psql", [
    "--set", "ON_ERROR_STOP=1",
    "--command",
    `CREATE SCHEMA "${probeSchema}"; CREATE TABLE "${probeSchema}".sentinel (id integer PRIMARY KEY, value text NOT NULL); INSERT INTO "${probeSchema}".sentinel VALUES (1, 'backup-restore-ok');`,
  ]);
  probeCreated = true;

  // Recreate the archive after adding the sentinel row so the restore proves data recovery.
  run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", archive]);
  run("createdb", ["--maintenance-db=postgres", restoredDatabase]);
  targetCreated = true;
  run("pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    "--dbname", restoredDatabase,
    archive,
  ]);

  const recovered = run("psql", [
    "--dbname", restoredDatabase,
    "--tuples-only",
    "--no-align",
    "--command",
    `SELECT value FROM "${probeSchema}".sentinel WHERE id = 1`,
  ]);
  if (recovered !== "backup-restore-ok") {
    throw new Error("Restored database did not contain the expected sentinel row.");
  }

  console.log("PostgreSQL backup/restore verified: custom archive restored and sentinel data recovered.");
} catch (error) {
  failure = error;
} finally {
  if (targetCreated) {
    try {
      run("dropdb", ["--if-exists", "--force", "--maintenance-db=postgres", restoredDatabase]);
    } catch (error) {
      failure ??= error;
    }
  }
  if (probeCreated) {
    try {
      run("psql", [
        "--set", "ON_ERROR_STOP=1",
        "--command", `DROP SCHEMA IF EXISTS "${probeSchema}" CASCADE`,
      ]);
    } catch (error) {
      failure ??= error;
    }
  }
  rmSync(backupDirectory, { recursive: true, force: true });
}

if (failure) throw failure;
