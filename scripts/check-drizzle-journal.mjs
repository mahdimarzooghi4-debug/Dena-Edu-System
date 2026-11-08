import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Fail closed on conflicting Drizzle migration identities before touching DB. */
export function validateMigrationLayout(fileNames, entries) {
  if (!Array.isArray(fileNames) || !Array.isArray(entries)) {
    return ["Migration files and journal entries must be arrays."];
  }
  const errors = [];
  const numbers = new Map();
  const tags = new Set();
  for (const filename of fileNames) {
    if (typeof filename !== "string" || !/^\d{4}_.+\.sql$/.test(filename)) {
      errors.push("Invalid SQL migration name: " + String(filename));
      continue;
    }
    const tag = filename.slice(0, -4);
    const number = tag.slice(0, 4);
    if (tags.has(tag)) errors.push("Duplicate SQL tag: " + tag);
    tags.add(tag);
    if (numbers.has(number)) {
      errors.push("Migration number reused: " + number +
        " (" + numbers.get(number) + ", " + tag + ")");
    } else numbers.set(number, tag);
  }
  const journalTags = new Set();
  let previous = -1;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (!entry || entry.idx !== index) errors.push("Journal index mismatch: " + index);
    const tag = entry?.tag;
    if (typeof tag !== "string" || !/^\d{4}_.+$/.test(tag)) {
      errors.push("Invalid journal tag at index " + index);
      continue;
    }
    if (journalTags.has(tag)) errors.push("Duplicate journal tag: " + tag);
    journalTags.add(tag);
    const number = Number(tag.slice(0, 4));
    if (number <= previous) errors.push("Journal migration order invalid at: " + tag);
    previous = number;
    if (!tags.has(tag)) errors.push("Missing SQL for journal tag: " + tag);
  }
  for (const tag of tags) {
    if (!journalTags.has(tag)) errors.push("Unregistered migration SQL: " + tag);
  }
  return errors;
}

const source = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === source) {
  try {
    const dir = resolve(dirname(source), "../drizzle");
    const files = readdirSync(dir).filter((file) => file.endsWith(".sql"));
    const journal = JSON.parse(readFileSync(join(dir, "meta/_journal.json"), "utf8"));
    const errors = validateMigrationLayout(files, journal.entries);
    if (errors.length) {
      console.error("Unsafe Drizzle migration layout:\n" + errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("Drizzle numbering and journal valid: " + files.length + " migrations");
    }
  } catch (error) {
    console.error("Unable to validate Drizzle migration layout:", error);
    process.exitCode = 1;
  }
}
