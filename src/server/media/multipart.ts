import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vendor-independent contracts only. No storage grant is minted here: an
 * authenticated, private adapter must bind every part to this server key,
 * size, checksum, TTL and private quarantine bucket before returning URLs.
 */
export const MULTIPART_PART_BYTES = 16 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = 5 * 1024 * 1024 * 1024;
export const MULTIPART_GRANT_TTL_SECONDS = 15 * 60;
const sha = /^[0-9a-f]{64}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type Part = { partNumber: number; bytes: number };
export type ReceivedPart = Part & { etag: string; sha256: string };
export function quarantineKey(uploadId: string): string {
  if (!uuid.test(uploadId)) throw new Error("invalid server upload id");
  return `quarantine/${uploadId}`;
}
export function planMultipart(uploadId: string, expectedBytes: number): {
  key: string; parts: Part[]; ttlSeconds: number;
} {
  const key = quarantineKey(uploadId);
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 16 ||
      expectedBytes > MAX_MULTIPART_BYTES) throw new Error("invalid size");
  const count = Math.ceil(expectedBytes / MULTIPART_PART_BYTES);
  return { key, ttlSeconds: MULTIPART_GRANT_TTL_SECONDS,
    parts: Array.from({ length: count }, (_, i) => ({
      partNumber: i + 1,
      bytes: Math.min(MULTIPART_PART_BYTES, expectedBytes - i * MULTIPART_PART_BYTES),
    })),
  };
}

/** The storage adapter must list parts itself, not trust client ETags/lengths. */
export function validateStorageParts(
  planned: Part[], stored: readonly ReceivedPart[],
): boolean {
  if (planned.length !== stored.length) return false;
  const seen = new Set<number>();
  return stored.every((part) => {
    if (!Number.isInteger(part.partNumber) ||
        seen.has(part.partNumber)) return false;
    seen.add(part.partNumber);
    const expected = planned[part.partNumber - 1];
    return !!expected && expected.partNumber === part.partNumber &&
      expected.bytes === part.bytes && sha.test(part.sha256) &&
      typeof part.etag === "string" && /^[\x21-\x7e]{1,256}$/.test(part.etag) &&
      !/[\/"'<>\\]/.test(part.etag);
  });
}
export function verifyQuarantineObject(
  uploadId: string, expectedBytes: number, expectedSha256: string,
  verifiedByStorage: { key: string; bytes: number; sha256: string; private: boolean },
): boolean {
  return verifiedByStorage.private === true &&
    verifiedByStorage.key === quarantineKey(uploadId) &&
    verifiedByStorage.bytes === expectedBytes &&
    sha.test(expectedSha256) && verifiedByStorage.sha256 === expectedSha256;
}

export type ProcessingAttestation = {
  version: 1; keyId: string; uploadId: string;
  sourceBytes: number; sourceSha256: string;
  outputBytes: number; outputSha256: string; outputKey: string;
  scanner: string; processorVersion: string; scannedAt: number;
  malware: "clean"; format: "mp4"; signature: string;
};
const fields = [
  "version", "keyId", "uploadId", "sourceBytes", "sourceSha256",
  "outputBytes", "outputSha256", "outputKey", "scanner",
  "processorVersion", "scannedAt", "malware", "format",
] as const;
/** A signed report is STILL not proof of scanning unless the signer actually
 * controls an isolated, reviewed scanner/transcoder. Never trust a client
 * supplied report or a key shared with the upload origin.
 */
export function verifyProcessingAttestation(
  report: ProcessingAttestation,
  expected: { keyId: string; uploadId: string; sourceBytes: number;
    sourceSha256: string; outputKey: string },
  signingKey: string, now = Date.now(),
): boolean {
  if (!report || typeof report !== "object" || !expected ||
      typeof signingKey !== "string" || signingKey.length < 32 ||
      Object.keys(report).sort().join(",") !==
        [...fields, "signature"].sort().join(",")) return false;
  if (report.version !== 1 || report.keyId !== expected.keyId ||
      report.uploadId !== expected.uploadId || !uuid.test(report.uploadId) ||
      report.sourceBytes !== expected.sourceBytes ||
      report.sourceSha256 !== expected.sourceSha256 ||
      report.outputKey !== expected.outputKey ||
      report.malware !== "clean" || report.format !== "mp4" ||
      !sha.test(report.sourceSha256) || !sha.test(report.outputSha256) ||
      !Number.isSafeInteger(report.outputBytes) || report.outputBytes < 16 ||
      !Number.isSafeInteger(report.scannedAt) ||
      report.scannedAt < now - 5 * 60_000 ||
      report.scannedAt > now + 30_000 ||
      typeof report.scanner !== "string" ||
      !/^[a-zA-Z0-9._-]{3,100}$/.test(report.scanner) ||
      typeof report.processorVersion !== "string" ||
      !/^[a-zA-Z0-9._-]{3,100}$/.test(report.processorVersion) ||
      !/^[0-9a-f]{64}$/.test(report.signature)) return false;
  const canonical = JSON.stringify(fields.map((field) => report[field]));
  const expectedSignature = createHmac("sha256", signingKey)
    .update("dena-media-attestation-v1\n").update(canonical).digest();
  return timingSafeEqual(expectedSignature, Buffer.from(report.signature, "hex"));
}

/** HEAD/metadata from a trusted PRIVATE adapter, checked independently of
 * the worker report before publishing an asset. No public object URL.
 */
export function verifyProcessedObject(
  report: ProcessingAttestation,
  stored: { key: string; bytes: number; sha256: string; contentType: string; private: boolean },
): boolean {
  return stored.private === true && stored.key === report.outputKey &&
    stored.bytes === report.outputBytes &&
    stored.sha256 === report.outputSha256 &&
    stored.contentType === "video/mp4";
}

/** Independently hash the ENTIRE private object as streamed bytes. Never trust
 * multipart ETags or storage-declared whole-file hashes. This is not scanning.
 * Caller must use an authenticated, truly private and immutable origin.
 */
type StreamedPrivateObject = {
  key: string; private: boolean; contentType: string;
  stream: AsyncIterable<Uint8Array>;
};
async function verifyStreamedPrivateObject(
  expectedKey: string,
  expectedBytes: number,
  expectedSha256: string,
  object: StreamedPrivateObject,
): Promise<boolean> {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 16 ||
      expectedBytes > MAX_MULTIPART_BYTES ||
      !sha.test(expectedSha256) ||
      object?.key !== expectedKey ||
      object.private !== true || object.contentType !== "video/mp4" ||
      !object.stream || typeof object.stream[Symbol.asyncIterator] !== "function") {
    return false;
  }
  const hasher = createHash("sha256");
  let total = 0;
  let first = Buffer.alloc(0);
  try {
    for await (const chunk of object.stream) {
      if (!(chunk instanceof Uint8Array) || chunk.byteLength === 0) return false;
      total += chunk.byteLength;
      if (total > expectedBytes) return false;
      hasher.update(chunk);
      if (first.length < 64) {
        first = Buffer.concat([first, Buffer.from(chunk.subarray(0, 64 - first.length))]);
      }
    }
  } catch {
    return false;
  }
  // ftyp is ONLY a shallow container header check, not an AV/codec verdict.
  if (total !== expectedBytes || first.length < 16 ||
      first.readUInt32BE(0) < 16 || first.readUInt32BE(0) > total ||
      first.toString("ascii", 4, 8) !== "ftyp" ||
      !/^[a-zA-Z0-9 ]{4}$/.test(first.toString("ascii", 8, 12))) return false;
  return timingSafeEqual(hasher.digest(), Buffer.from(expectedSha256, "hex"));
}

export function verifyQuarantineStream(
  uploadId: string,
  expectedBytes: number,
  expectedSha256: string,
  object: StreamedPrivateObject,
): Promise<boolean> {
  return verifyStreamedPrivateObject(
    quarantineKey(uploadId), expectedBytes, expectedSha256, object,
  );
}

/** Processed bytes may have a DIFFERENT hash/size from the raw input.
 * Only a server-constructed private MP4 key may be accepted.
 */
export function verifyProcessedStream(
  expected: { key: string; bytes: number; sha256: string },
  object: StreamedPrivateObject,
): Promise<boolean> {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/.test(expected.key)) {
    return Promise.resolve(false);
  }
  return verifyStreamedPrivateObject(
    expected.key, expected.bytes, expected.sha256, object,
  );
}
