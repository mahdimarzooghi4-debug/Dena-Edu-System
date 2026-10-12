import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateDataset } from "../../scripts/validate-dena-ai-dataset.mjs";

const directories = [];
const trainingRecord = (overrides = {}) => ({
  recordId: "item-001",
  input: "مفهوم کسر چیست؟",
  target: "کسر بخشی از یک کل را نشان می‌دهد.",
  sourceRef: "dena:math:fractions",
  sourceVersion: "v1",
  split: "train",
  ...overrides,
});
const baseManifest = (overrides = {}) => ({
  schemaVersion: "dena-ai-dataset/v1",
  datasetId: "dena-math-v1",
  mode: "dena_initial_training",
  ownerKind: "dena",
  ownerRef: "dena:education",
  rightsReviewRef: "rights:review-001",
  rightsApprovedBy: "reviewer-001",
  rightsApprovedAt: "2026-10-12T10:00:00Z",
  dataFile: "records.jsonl",
  sha256: "0".repeat(64),
  recordCount: 1,
  ...overrides,
});

async function createFixture(records, manifestOverrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "dena-ai-data-"));
  directories.push(directory);
  const data = records.map((record) => typeof record === "string"
    ? record
    : JSON.stringify(record)).join("\n") + "\n";
  await writeFile(join(directory, "records.jsonl"), data, "utf8");
  const manifest = baseManifest({
    sha256: createHash("sha256").update(data).digest("hex"),
    recordCount: records.length,
    ...manifestOverrides,
  });
  const manifestPath = join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
  return { directory, manifestPath, manifest };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

describe("Dena AI dataset intake validator", () => {
  it("accepts a hash-verified, Dena-owned initial training dataset without starting training", async () => {
    const fixture = await createFixture([
      trainingRecord(),
      trainingRecord({
        recordId: "item-002",
        input: "عدد زوج چیست؟",
        target: "عددی است که بر دو بخش‌پذیر باشد.",
        split: "validation",
      }),
    ], { recordCount: 2 });

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.readiness).toBe("structure_valid_human_rights_review_required_no_training_started");
  });

  it("accepts institution context only when it has a separate pseudonymous student scope", async () => {
    const fixture = await createFixture([{
      recordId: "video-chunk-01",
      text: "در این ویدئو روش حل معادله توضیح داده شده است.",
      sourceRef: "institute:video-42",
      sourceVersion: "sha256:abcd1234",
    }], {
      datasetId: "student-context-opaque-01",
      mode: "student_context",
      ownerKind: "institution",
      ownerRef: "institute:school-17",
      studentScopeRef: "student-scope:opaque-01",
      recordCount: 1,
    });

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(true);
    expect(result.readiness).toBe("context_only_not_shared_training");
  });

  it("rejects student-specific records from the shared initial training manifest", async () => {
    const fixture = await createFixture([trainingRecord()], {
      mode: "dena_initial_training",
      ownerKind: "institution",
      ownerRef: "institute:school-17",
    });

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("manifest:initial_training_must_be_dena_owned_and_unscoped");
  });

  it("rejects train split records in the evaluation dataset", async () => {
    const fixture = await createFixture([trainingRecord()], {
      mode: "evaluation",
      recordCount: 1,
    });

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("record:1:split_invalid");
  });

  it("rejects identical input/target content copied across training splits", async () => {
    const fixture = await createFixture([
      trainingRecord({ split: "train" }),
      trainingRecord({ recordId: "item-002", split: "validation" }),
    ], { recordCount: 2 });

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("record:2:duplicate_content");
  });

  it("rejects extra answer-key or student identity fields without echoing content", async () => {
    const fixture = await createFixture([{
      ...trainingRecord(),
      answerKey: "گزینه الف",
      studentId: "student-123",
      input: "درس خصوصی student.person@example.com",
    }]);

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("record:1:keys_or_shape_invalid");
    expect(result.errors.join(" ")).not.toContain("student.person@example.com");
  });

  it("rejects a student context manifest without its separate pseudonymous scope", async () => {
    const fixture = await createFixture([{
      recordId: "video-chunk-01",
      text: "متن آموزشی مجاز",
      sourceRef: "institute:video-42",
      sourceVersion: "v1",
    }], {
      mode: "student_context",
      ownerKind: "institution",
      ownerRef: "institute:school-17",
      studentScopeRef: "student-scope:opaque-01",
    });
    const manifest = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
    delete manifest.studentScopeRef;
    await writeFile(fixture.manifestPath, JSON.stringify(manifest), "utf8");

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("manifest:keys_or_shape_invalid");
  });

  it("rejects symlinked data files even when the target stays inside the directory", async () => {
    const fixture = await createFixture([trainingRecord()], { dataFile: "alias.jsonl" });
    await symlink(join(fixture.directory, "records.jsonl"), join(fixture.directory, "alias.jsonl"));

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("data:not_a_regular_file");
  });

  it("rejects a visible Iranian mobile number in content", async () => {
    const fixture = await createFixture([
      trainingRecord({ target: "برای تماس 09123456789 را بگیرید." }),
    ]);

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("record:1:target_invalid_or_sensitive");
  });

  it("fails when the record file changes after its manifest hash was recorded", async () => {
    const fixture = await createFixture([trainingRecord()]);
    await writeFile(join(fixture.directory, "records.jsonl"), JSON.stringify(
      trainingRecord({ target: "محتوای تغییرکرده" }),
    ) + "\n");

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("data:sha256_mismatch");
  });

  it("rejects a path traversal before reading a file outside the manifest directory", async () => {
    const fixture = await createFixture([trainingRecord()], {
      dataFile: "../outside.jsonl",
    });

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("manifest:data_path_invalid");
  });

  it("rejects blank and malformed JSONL records", async () => {
    const fixture = await createFixture(["{bad json}", trainingRecord(), ""]);
    const data = await readFile(join(fixture.directory, "records.jsonl"), "utf8");
    const manifest = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
    manifest.sha256 = createHash("sha256").update(data).digest("hex");
    manifest.recordCount = 2;
    await writeFile(fixture.manifestPath, JSON.stringify(manifest), "utf8");

    const result = await validateDataset(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("record:1:invalid_json");
    expect(result.errors).toContain("record:3:blank_line");
  });
});
