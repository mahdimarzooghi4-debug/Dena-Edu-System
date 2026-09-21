import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MAX_MULTIPART_BYTES, MULTIPART_PART_BYTES, planMultipart,
  quarantineKey, validateStorageParts, verifyProcessingAttestation,
  verifyProcessedObject, verifyQuarantineObject, type ProcessingAttestation,
} from "./multipart";

const uploadId = "01994a60-68ce-49b0-87eb-1d0ae67f62a4";
const assetId = "012a97fd-26be-4c81-97e0-6795db762749";
const digest = "a".repeat(64);
const secret = "attestation-secret".repeat(3);
const fields = [
  "version", "keyId", "uploadId", "sourceBytes", "sourceSha256",
  "outputBytes", "outputSha256", "outputKey", "scanner",
  "processorVersion", "scannedAt", "malware", "format",
] as const;
const expected = { keyId: "scanner-v1", uploadId,
  sourceBytes: 16_000_000, sourceSha256: digest,
  outputKey: `${assetId}/${assetId}.mp4` };
function signed(now: number): ProcessingAttestation {
  const report: ProcessingAttestation = {
    version: 1, ...expected, outputBytes: 9_000_000,
    outputSha256: "b".repeat(64), scanner: "clamav-1",
    processorVersion: "ffmpeg-7", scannedAt: now,
    malware: "clean", format: "mp4", signature: "",
  };
  report.signature = createHmac("sha256", secret)
    .update("dena-media-attestation-v1\n")
    .update(JSON.stringify(fields.map((key) => report[key])))
    .digest("hex");
  return report;
}
describe("vendor-neutral direct multipart quarantine contract", () => {
  it("plans bounded parts without proxying media via Next.js", () => {
    const p = planMultipart(uploadId, MULTIPART_PART_BYTES * 2 + 19);
    expect(p.key).toBe(`quarantine/${uploadId}`);
    expect(p.ttlSeconds).toBe(900);
    expect(p.parts).toEqual([
      { partNumber: 1, bytes: MULTIPART_PART_BYTES },
      { partNumber: 2, bytes: MULTIPART_PART_BYTES },
      { partNumber: 3, bytes: 19 },
    ]);
    expect(planMultipart(uploadId, MAX_MULTIPART_BYTES).parts.length).toBe(320);
    for (const size of [0, 15, MAX_MULTIPART_BYTES + 1, Infinity, NaN, 10.1]) {
      expect(() => planMultipart(uploadId, size)).toThrow();
    }
    expect(() => quarantineKey("../private/escape")).toThrow();
  });
  it("refuses missing, duplicated or modified storage-listed parts", () => {
    const p = planMultipart(uploadId, MULTIPART_PART_BYTES + 20);
    const parts = p.parts.map((part) => ({
      ...part, etag: "abc123", sha256: digest,
    }));
    expect(validateStorageParts(p.parts, parts)).toBe(true);
    expect(validateStorageParts(p.parts, [parts[0]])).toBe(false);
    expect(validateStorageParts(p.parts, [parts[0], parts[0]])).toBe(false);
    expect(validateStorageParts(p.parts, [parts[0], { ...parts[1], bytes: 21 }])).toBe(false);
    expect(validateStorageParts(p.parts, [parts[0], { ...parts[1], etag: '"<a>' }])).toBe(false);
    expect(verifyQuarantineObject(uploadId, MULTIPART_PART_BYTES + 20, digest,
      { key: p.key, bytes: MULTIPART_PART_BYTES + 20, sha256: digest, private: true },
    )).toBe(true);
    expect(verifyQuarantineObject(uploadId, MULTIPART_PART_BYTES + 20, digest,
      { key: p.key, bytes: MULTIPART_PART_BYTES + 20, sha256: digest, private: false },
    )).toBe(false);
  });
});
describe("separately signed scan/transcode attestations", () => {
  it("binds input AND output, job, scanner, key id and clock", () => {
    const now = 1_800_000_000_000;
    const report = signed(now);
    expect(verifyProcessingAttestation(report, expected, secret, now)).toBe(true);
    expect(verifyProcessingAttestation({ ...report, malware: "infected" } as never,
      expected, secret, now)).toBe(false);
    expect(verifyProcessingAttestation({ ...report, outputSha256: digest },
      expected, secret, now)).toBe(false);
    expect(verifyProcessingAttestation(report, { ...expected,
      uploadId: assetId }, secret, now)).toBe(false);
    expect(verifyProcessingAttestation(report, expected, "wrong-key".repeat(5), now)).toBe(false);
    expect(verifyProcessingAttestation(report, expected, secret, now + 300_001)).toBe(false);
    expect(verifyProcessingAttestation({ ...report, fake: true } as never,
      expected, secret, now)).toBe(false);
    expect(verifyProcessedObject(report, { key: report.outputKey,
      bytes: report.outputBytes, sha256: report.outputSha256,
      private: true, contentType: "video/mp4" })).toBe(true);
    expect(verifyProcessedObject(report, { key: report.outputKey,
      bytes: report.outputBytes, sha256: digest,
      private: true, contentType: "video/mp4" })).toBe(false);
  });
});
