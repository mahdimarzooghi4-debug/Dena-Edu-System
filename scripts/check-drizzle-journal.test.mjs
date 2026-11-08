import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMigrationLayout as check } from "./check-drizzle-journal.mjs";
const journal = (...tags) => tags.map((tag, idx) => ({ tag, idx }));

test("accepts ordered unique migrations and historical numbering gaps", () => {
  assert.deepEqual(check(["0000_initial.sql", "0057_later.sql"],
    journal("0000_initial", "0057_later")), []);
});

test("rejects competing branches claiming 0058", () => {
  const errors = check(["0058_service.sql", "0058_organization.sql"],
    journal("0058_service", "0058_organization"));
  assert.ok(errors.some((error) => error.includes("Migration number reused: 0058")));
  assert.ok(errors.some((error) => error.includes("migration order invalid")));
});

test("rejects missing/unregistered SQL, duplicate tags and wrong journal indices", () => {
  assert.ok(check(["0057_old.sql", "0058_new.sql"], journal("0057_old"))
    .some((e) => e.includes("Unregistered migration SQL: 0058_new")));
  assert.ok(check(["0057_old.sql"], journal("0057_old", "0058_missing"))
    .some((e) => e.includes("Missing SQL for journal tag: 0058_missing")));
  assert.ok(check(["0057_old.sql"], journal("0057_old", "0057_old"))
    .some((e) => e.includes("Duplicate journal tag: 0057_old")));
  assert.ok(check(["0057_old.sql"], [{ idx: 2, tag: "0057_old" }])
    .some((e) => e.includes("Journal index mismatch")));
});

test("rejects malformed inputs rather than guessing fixes", () => {
  assert.ok(check(["unversioned.sql"], []).some((e) => e.includes("Invalid SQL migration")));
  assert.deepEqual(check(null, []), ["Migration files and journal entries must be arrays."]);
});
