#!/usr/bin/env node
/**
 * Offline Dena AI dataset intake checks.
 * This validates file shape and provenance references only. It does not prove
 * ownership/rights, privacy safety, educational quality, or training readiness.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_DATA_BYTES = 256 * 1024 * 1024;
const MAX_RECORD_BYTES = 1024 * 1024;
const MAX_RECORDS = 1_000_000;
const MAX_ERRORS = 100;
const MANIFEST_KEYS = [
  "schemaVersion", "datasetId", "mode", "ownerKind", "ownerRef",
  "rightsReviewRef", "rightsApprovedBy", "rightsApprovedAt", "dataFile",
  "sha256", "recordCount",
];
const TRAINING_RECORD_KEYS = [
  "recordId", "input", "target", "sourceRef", "sourceVersion", "split",
];
const CONTEXT_RECORD_KEYS = [
  "recordId", "text", "sourceRef", "sourceVersion",
];
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const IRANIAN_MOBILE_PATTERN = /(?:\+?98|0)9(?:[\s-]?\d){9}(?!\d)/;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function validRef(value, max = 200) {
  return typeof value === "string" &&
    value.length >= 3 && value.length <= max &&
    /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value);
}

function validText(value, max) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    !EMAIL_PATTERN.test(value) &&
    !IRANIAN_MOBILE_PATTERN.test(value);
}

function addError(errors, code) {
  if (errors.length < MAX_ERRORS) errors.push(code);
}

function validateManifest(manifest, errors) {
  const expectedKeys = manifest?.mode === "student_context"\n    ? [...MANIFEST_KEYS, "studentScopeRef"]\n    : MANIFEST_KEYS;\n  if (!hasExactKeys(manifest, expectedKeys)) {
    addError(errors, "manifest:keys_or_shape_invalid");
    return false;
  }
  if (manifest.schemaVersion !== "dena-ai-dataset/v1") addError(errors, "manifest:unsupported_version");
  if (!validRef(manifest.datasetId, 100)) addError(errors, "manifest:dataset_id_invalid");
  if (!["dena_initial_training", "student_context", "evaluation"].includes(manifest.mode)) {
    addError(errors, "manifest:mode_invalid");
  }
  if (!["dena", "institution"].includes(manifest.ownerKind)) addError(errors, "manifest:owner_kind_invalid");
  if (!validRef(manifest.ownerRef)) addError(errors, "manifest:owner_ref_invalid");
  if (!validRef(manifest.rightsReviewRef)) addError(errors, "manifest:rights_review_ref_missing");
  if (!validRef(manifest.rightsApprovedBy, 100)) addError(errors, "manifest:rights_reviewer_invalid");
  if (typeof manifest.rightsApprovedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(manifest.rightsApprovedAt) ||
      Number.isNaN(Date.parse(manifest.rightsApprovedAt))) {
    addError(errors, "manifest:rights_approval_time_invalid");
  }
  if (typeof manifest.dataFile !== "string" || manifest.dataFile.length > 500 ||
      isAbsolute(manifest.dataFile) ||
      manifest.dataFile.split(/[\\/]/).includes("..") ||
      manifest.dataFile.includes("\\") ||
      manifest.dataFile.trim() !== manifest.dataFile) {
    addError(errors, "manifest:data_path_invalid");
  }
  if (typeof manifest.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.sha256)) {
    addError(errors, "manifest:sha256_invalid");
  }
  if (!Number.isSafeInteger(manifest.recordCount) || manifest.recordCount < 1 ||
      manifest.recordCount > MAX_RECORDS) {
    addError(errors, "manifest:record_count_invalid");
  }
  if (manifest.mode === "dena_initial_training" &&
      (manifest.ownerKind !== "dena" || "studentScopeRef" in manifest)) {
    addError(errors, "manifest:initial_training_must_be_dena_owned_and_unscoped");
  }
  if (manifest.mode === "student_context" &&
      (manifest.ownerKind !== "institution" || !/^student-scope:[A-Za-z0-9_-]{8,96}$/.test(manifest.studentScopeRef))) {
    addError(errors, "manifest:student_context_scope_invalid");
  }
  if (manifest.mode === "evaluation" && "studentScopeRef" in manifest) {
    addError(errors, "manifest:evaluation_must_not_be_student_scoped");
  }
  return errors.length === 0;
}

function validateRecord(record, mode, errors, lineNumber, recordIds, contentSplits) {
  const context = mode === "student_context";
  const expectedKeys = context ? CONTEXT_RECORD_KEYS : TRAINING_RECORD_KEYS;
  if (!hasExactKeys(record, expectedKeys)) {
    addError(errors, `record:${lineNumber}:keys_or_shape_invalid`);
    return;
  }

  if (!validRef(record.recordId, 128)) addError(errors, `record:${lineNumber}:id_invalid`);
  else if (recordIds.has(record.recordId)) addError(errors, `record:${lineNumber}:duplicate_id`);
  else recordIds.add(record.recordId);

  for (const [field, max] of context
    ? [["text", 200_000]]
    : [["input", 20_000], ["target", 20_000]]) {
    if (!validText(record[field], max)) addError(errors, `record:${lineNumber}:${field}_invalid_or_sensitive`);
  }
  if (!validRef(record.sourceRef)) addError(errors, `record:${lineNumber}:source_ref_invalid`);
  if (!validRef(record.sourceVersion, 100)) addError(errors, `record:${lineNumber}:source_version_invalid`);

  if (context) return;
  const allowedSplits = mode === "dena_initial_training" ? ["train", "validation"] : ["evaluation"];
  if (!allowedSplits.includes(record.split)) addError(errors, `record:${lineNumber}:split_invalid`);

  if (validText(record.input, 20_000) && validText(record.target, 20_000) &&
      allowedSplits.includes(record.split)) {
    const signature = createHash("sha256")
      .update(record.input.trim().replace(/\s+/g, " "))
      .update("\0")
      .update(record.target.trim().replace(/\s+/g, " "))
      .digest("hex");
    const previousSplit = contentSplits.get(signature);
    if (previousSplit) addError(errors, `record:${lineNumber}:duplicate_content`);
    else contentSplits.set(signature, record.split);
  }
}

async function readAndValidateRecords(filePath, manifest, errors) {
  const info = await lstat(filePath).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) {
    addError(errors, "data:not_a_regular_file");
    return { recordCount: 0, sha256: null };
  }
  if (info.size > MAX_DATA_BYTES) {
    addError(errors, "data:file_too_large");
    return { recordCount: 0, sha256: null };
  }
  const hash = createHash("sha256");
  const ids = new Set();
  const contentSplits = new Map();
  let recordCount = 0;
  let lineNumber = 0;
  let oversized = false;
  const input = createReadStream(filePath);
  input.on("data", (chunk) => hash.update(chunk));
  const lines = createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      lineNumber++;
      if (Buffer.byteLength(line, "utf8") > MAX_RECORD_BYTES) {
        addError(errors, `record:${lineNumber}:too_large`);
        oversized = true;
        continue;
      }
      if (!line.trim()) {
        addError(errors, `record:${lineNumber}:blank_line`);
        continue;
      }
      recordCount++;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        addError(errors, `record:${lineNumber}:invalid_json`);
        continue;
      }
      validateRecord(record, manifest.mode, errors, lineNumber, ids, contentSplits);
    }
  } catch {
    addError(errors, "data:read_failed");
  }
  const sha256 = hash.digest("hex");
  if (oversized) addError(errors, "data:record_size_limit_exceeded");
  if (recordCount !== manifest.recordCount) addError(errors, "data:record_count_mismatch");
  if (manifest.sha256 !== sha256) addError(errors, "data:sha256_mismatch");
  return { recordCount, sha256 };
}

export async function validateDataset(manifestPath) {
  const errors = [];
  const absoluteManifestPath = resolve(manifestPath);
  const manifestInfo = await lstat(absoluteManifestPath).catch(() => null);
  if (!manifestInfo?.isFile() || manifestInfo.isSymbolicLink()) {
    return { ok: false, errors: ["manifest:not_a_regular_file"], recordCount: 0, sha256: null };
  }
  if (manifestInfo.size > MAX_MANIFEST_BYTES) {
    return { ok: false, errors: ["manifest:file_too_large"], recordCount: 0, sha256: null };
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
  } catch {
    return { ok: false, errors: ["manifest:invalid_json"], recordCount: 0, sha256: null };
  }

  validateManifest(manifest, errors);
  if (errors.length) return { ok: false, errors, recordCount: 0, sha256: null };

  const manifestDirectory = dirname(absoluteManifestPath);
  const dataPath = join(manifestDirectory, manifest.dataFile);
  const actualManifestDirectory = await realpath(manifestDirectory).catch(() => null);
  const actualDataPath = await realpath(dataPath).catch(() => null);
  if (!actualManifestDirectory || !actualDataPath) {
    return { ok: false, errors: ["data:file_not_found"], recordCount: 0, sha256: null };
  }
  const fromManifestDirectory = relative(actualManifestDirectory, actualDataPath);
  if (fromManifestDirectory === ".." ||
      fromManifestDirectory.startsWith(`..${sep}`) ||
      isAbsolute(fromManifestDirectory)) {
    return { ok: false, errors: ["manifest:data_path_escapes_directory"], recordCount: 0, sha256: null };
  }

  const result = await readAndValidateRecords(actualDataPath, manifest, errors);
  return {
    ok: errors.length === 0,
    errors,
    recordCount: result.recordCount,
    sha256: result.sha256,
    readiness: manifest.mode === "student_context"
      ? "context_only_not_shared_training"
      : manifest.mode === "dena_initial_training"
        ? "structure_valid_human_rights_review_required_no_training_started"
        : "evaluation_only_no_training_started",
  };
}

function printResult(result) {
  if (!result.ok) {
    console.error("Dena AI dataset validation: BLOCKED");
    for (const code of result.errors) console.error(`- ${code}`);
    return;
  }
  console.log("Dena AI dataset validation: STRUCTURE CHECKS PASSED");
  console.log(`Records checked: ${result.recordCount}`);
  console.log(`Data SHA-256: ${result.sha256}`);
  console.log(`Readiness: ${result.readiness}`);
  console.log("This does not prove rights, privacy, educational quality, or model readiness.");
}

function parseManifestArgument(argv) {
  if (argv.length !== 2 || argv[0] !== "--manifest" || !argv[1]) return null;
  return argv[1];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifestPath = parseManifestArgument(process.argv.slice(2));
  if (!manifestPath) {
    console.error("Usage: node scripts/validate-dena-ai-dataset.mjs --manifest <path>");
    process.exitCode = 2;
  } else {
    try {
      const result = await validateDataset(manifestPath);
      printResult(result);
      if (!result.ok) process.exitCode = 1;
    } catch {
      console.error("Dena AI dataset validation: BLOCKED");
      console.error("- dataset:unexpected_io_error");
      process.exitCode = 1;
    }
  }
}
