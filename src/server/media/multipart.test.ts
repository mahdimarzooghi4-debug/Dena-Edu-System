import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MAX_MULTIPART_BYTES, MULTIPART_PART_BYTES, planMultipart,
  quarantineKey, validateStorageParts, verifyQuarantineStream, verifyProcessingAttestation,
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

describe("independent streaming private object digest, without buffering 5 GiB", () => {
  const mp4 = Buffer.from(
    "00000018667479706d7034326d70343269736f6d00000000", "hex",
  );
  const bytes = 16 * 1024 * 1024 + 19;
  const data = Buffer.alloc(bytes);
  mp4.copy(data);
  const actualHash = createHash("sha256").update(data).digest("hex");
  const stored = (stream: AsyncIterable<Uint8Array>, overrides = {}) => ({
    key: `quarantine/${uploadId}`, private: true,
    contentType: "video/mp4", stream, ...overrides,
  });
  const chunks = async function* (source: Buffer) {
    for (let n = 0; n < source.length; n += 131_071) {
      yield source.subarray(n, Math.min(n + 131_071, source.length));
    }
  };
  it("hashes every byte of a >16 MiB private object incrementally", async () => {
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(data)),
    )).toBe(true);
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(data), { private: false }),
    )).toBe(false);
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(data), {
        key: `private/${uploadId}`,
      }),
    )).toBe(false);
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(data), {
        contentType: "application/octet-stream",
      }),
    )).toBe(false);
  });
  it("rejects mutated bytes, truncated/extra streams and invalid MP4", async () => {
    const changed = Buffer.from(data);
    changed[bytes - 9] ^= 0xff;
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(changed)),
    )).toBe(false);
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(data.subarray(0, bytes - 1))),
    )).toBe(false);
    const extra = Buffer.concat([data, Buffer.from([0])]);
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(chunks(extra)),
    )).toBe(false);
    const invalid = Buffer.from(data);
    invalid.write("nope", 4, "ascii");
    const invalidHash = createHash("sha256").update(invalid).digest("hex");
    expect(await verifyQuarantineStream(
      uploadId, bytes, invalidHash, stored(chunks(invalid)),
    )).toBe(false);
    async function* broken(): AsyncIterable<Uint8Array> {
      yield mp4; throw new Error("broken private stream");
    }
    expect(await verifyQuarantineStream(
      uploadId, bytes, actualHash, stored(broken()),
    )).toBe(false);
  });
});
