import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MULTIPART_PART_BYTES, type ReceivedPart } from "./multipart";
import {
  completeVerifiedMultipartUpload, createGrantedMultipartUpload,
  MultipartStorageError, validateSignedPartGrant,
  type PrivateMultipartStorageAdapter, type PrivateStoredObject,
} from "./storage-adapter";

const uploadId = "01994a60-68ce-49b0-87eb-1d0ae67f62a4";
const storageUploadId = "storage-upload-20261016-01";
const allowedUploadOrigins = new Set(["https://uploads.example.test"]);
const payload = Buffer.from("00000018667479706d7034326d70343269736f6d00000000", "hex");
const sha256 = createHash("sha256").update(payload).digest("hex");
const parts: ReceivedPart[] = [{
  partNumber: 1, bytes: payload.length, etag: "etag-part-1", sha256,
}];
const object = (overrides: Partial<PrivateStoredObject> = {}): PrivateStoredObject => ({
  key: `quarantine/${uploadId}`,
  private: true,
  contentType: "video/mp4",
  stream: (async function* () { yield payload; })(),
  ...overrides,
});

function makeAdapter(overrides: Partial<PrivateMultipartStorageAdapter> = {}) {
  const adapter: PrivateMultipartStorageAdapter = {
    providerId: "fake-storage",
    allowedUploadOrigins,
    createMultipartUpload: vi.fn(async () => ({ storageUploadId })),
    createPartGrant: vi.fn(async () => ({
      url: "https://uploads.example.test/upload/signed?signature=secret",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    })),
    listParts: vi.fn(async () => parts),
    completeMultipartUpload: vi.fn(async () => undefined),
    abortMultipartUpload: vi.fn(async () => undefined),
    readPrivateObject: vi.fn(async () => object()),
    deletePrivateObject: vi.fn(async () => undefined),
    ...overrides,
  };
  return adapter;
}

describe("vendor-neutral private multipart storage adapter", () => {
  it("creates bounded grants scoped to a private server-generated key", async () => {
    const adapter = makeAdapter();
    const created = await createGrantedMultipartUpload(adapter, {
      uploadId, expectedBytes: payload.length, expectedSha256: sha256,
    });
    expect(created).toMatchObject({
      storageUploadId, key: `quarantine/${uploadId}`,
      parts: [{ partNumber: 1, bytes: payload.length }],
    });
    expect(adapter.createMultipartUpload).toHaveBeenCalledWith({
      key: `quarantine/${uploadId}`, contentType: "video/mp4",
      expectedBytes: payload.length, expectedSha256: sha256,
    });
    expect(adapter.createPartGrant).toHaveBeenCalledWith({
      key: `quarantine/${uploadId}`, storageUploadId, partNumber: 1,
      expectedBytes: payload.length, ttlSeconds: 900,
    });
    expect(created.parts[0].url).toContain("signature=secret");
  });

  it("aborts storage state when a grant escapes its allowlist or expiry", async () => {
    const adapter = makeAdapter({
      createPartGrant: vi.fn(async () => ({
        url: "https://attacker.example/upload/signed?signature=secret",
        expiresAt: new Date(Date.now() + 5 * 60_000),
      })),
    });
    await expect(createGrantedMultipartUpload(adapter, {
      uploadId, expectedBytes: payload.length, expectedSha256: sha256,
    })).rejects.toMatchObject({ kind: "grant_invalid" });
    expect(adapter.abortMultipartUpload).toHaveBeenCalledWith({
      key: `quarantine/${uploadId}`, storageUploadId,
    });
    expect(validateSignedPartGrant({
      url: "https://uploads.example.test/upload",
      expiresAt: new Date(Date.now() + 16 * 60_000),
    }, adapter)).toBe(false);
    expect(validateSignedPartGrant({
      url: "http://uploads.example.test/upload",
      expiresAt: new Date(Date.now() + 5 * 60_000),
    }, adapter)).toBe(false);
  });

  it("bounds concurrent part-grant calls for large uploads", async () => {
    const expectedBytes = MULTIPART_PART_BYTES * 17 + 1;
    let active = 0;
    let maximumActive = 0;
    const adapter = makeAdapter({
      createPartGrant: vi.fn(async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, 2));
          return {
            url: "https://uploads.example.test/upload/signed?signature=secret",
            expiresAt: new Date(Date.now() + 10 * 60_000),
          };
        } finally {
          active -= 1;
        }
      }),
    });

    const created = await createGrantedMultipartUpload(adapter, {
      uploadId, expectedBytes, expectedSha256: sha256,
    });

    expect(created.parts).toHaveLength(18);
    expect(adapter.createPartGrant).toHaveBeenCalledTimes(18);
    expect(maximumActive).toBe(8);
  });

  it("waits for in-flight grants before aborting a partially signed upload", async () => {
    const expectedBytes = MULTIPART_PART_BYTES * 17 + 1;
    let active = 0;
    let maximumActive = 0;
    let activeAtAbort = -1;
    const adapter = makeAdapter({
      createPartGrant: vi.fn(async ({ partNumber }) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        try {
          if (partNumber === 1) {
            await new Promise((resolve) => setTimeout(resolve, 5));
            throw new Error("provider signing failed");
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
          return {
            url: "https://uploads.example.test/upload/signed?signature=secret",
            expiresAt: new Date(Date.now() + 10 * 60_000),
          };
        } finally {
          active -= 1;
        }
      }),
      abortMultipartUpload: vi.fn(async () => { activeAtAbort = active; }),
    });

    await expect(createGrantedMultipartUpload(adapter, {
      uploadId, expectedBytes, expectedSha256: sha256,
    })).rejects.toMatchObject({ kind: "storage_unavailable" });

    expect(maximumActive).toBeLessThanOrEqual(8);
    expect(adapter.createPartGrant).toHaveBeenCalledTimes(8);
    expect(activeAtAbort).toBe(0);
  });

  it("lists and validates server-side parts before complete, then hashes the private object", async () => {
    const adapter = makeAdapter();
    const result = await completeVerifiedMultipartUpload(adapter, {
      uploadId, storageUploadId, expectedBytes: payload.length, expectedSha256: sha256,
    });
    expect(result).toEqual({ key: `quarantine/${uploadId}`, bytes: payload.length, sha256 });
    expect(adapter.completeMultipartUpload).toHaveBeenCalledWith({
      key: `quarantine/${uploadId}`, storageUploadId, parts,
    });
    expect(adapter.readPrivateObject).toHaveBeenCalledWith({ key: `quarantine/${uploadId}` });
  });

  it("aborts incomplete part sets and deletes a completed object that fails verification", async () => {
    const incomplete = makeAdapter({ listParts: vi.fn(async () => []) });
    await expect(completeVerifiedMultipartUpload(incomplete, {
      uploadId, storageUploadId, expectedBytes: payload.length, expectedSha256: sha256,
    })).rejects.toMatchObject({ kind: "parts_invalid" });
    expect(incomplete.abortMultipartUpload).toHaveBeenCalledOnce();
    expect(incomplete.completeMultipartUpload).not.toHaveBeenCalled();

    const corrupt = makeAdapter({
      readPrivateObject: vi.fn(async () => object({ private: false })),
    });
    await expect(completeVerifiedMultipartUpload(corrupt, {
      uploadId, storageUploadId, expectedBytes: payload.length, expectedSha256: sha256,
    })).rejects.toBeInstanceOf(MultipartStorageError);
    expect(corrupt.deletePrivateObject).toHaveBeenCalledWith({ key: `quarantine/${uploadId}` });
    expect(corrupt.abortMultipartUpload).not.toHaveBeenCalled();
  });
});
