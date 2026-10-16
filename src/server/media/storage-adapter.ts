import {
  MULTIPART_GRANT_TTL_SECONDS, planMultipart, validateStorageParts,
  verifyQuarantineStream, type Part, type ReceivedPart,
} from "./multipart";

export type SignedPartGrant = {
  url: string;
  expiresAt: Date;
};

export type PrivateStoredObject = {
  key: string;
  private: boolean;
  contentType: string;
  stream: AsyncIterable<Uint8Array>;
};

/** Vendor-neutral contract. The implementation must use a private quarantine
 * bucket, enforce the expected object key and size, and never expose credentials.
 */
export interface PrivateMultipartStorageAdapter {
  readonly providerId: string;
  readonly allowedUploadOrigins: ReadonlySet<string>;
  createMultipartUpload(input: {
    key: string;
    contentType: "video/mp4";
    expectedBytes: number;
    expectedSha256: string;
  }): Promise<{ storageUploadId: string }>;
  createPartGrant(input: {
    key: string;
    storageUploadId: string;
    partNumber: number;
    expectedBytes: number;
    ttlSeconds: number;
  }): Promise<SignedPartGrant>;
  listParts(input: { key: string; storageUploadId: string }):
    Promise<readonly ReceivedPart[]>;
  completeMultipartUpload(input: {
    key: string;
    storageUploadId: string;
    parts: readonly ReceivedPart[];
  }): Promise<void>;
  abortMultipartUpload(input: { key: string; storageUploadId: string }): Promise<void>;
  readPrivateObject(input: { key: string }): Promise<PrivateStoredObject>;
  deletePrivateObject(input: { key: string }): Promise<void>;
}

export class MultipartStorageError extends Error {
  constructor(readonly kind:
    "adapter_invalid" | "storage_unavailable" | "grant_invalid" |
    "parts_invalid" | "object_invalid") {
    super(kind);
  }
}

export type GrantedPart = Part & SignedPartGrant;
export type CreatedMultipartUpload = {
  storageUploadId: string;
  key: string;
  parts: GrantedPart[];
};

const providerIdPattern = /^[a-z][a-z0-9._-]{1,30}$/;
const uploadIdPattern = /^[A-Za-z0-9._:-]{8,200}$/;

function validateAdapter(adapter: PrivateMultipartStorageAdapter): boolean {
  return !!adapter && providerIdPattern.test(adapter.providerId) &&
    adapter.allowedUploadOrigins instanceof Set && adapter.allowedUploadOrigins.size > 0 &&
    [...adapter.allowedUploadOrigins].every((origin) => {
      try {
        const url = new URL(origin);
        return url.protocol === "https:" && url.origin === origin &&
          !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
      } catch { return false; }
    });
}

export function validateSignedPartGrant(
  grant: SignedPartGrant,
  adapter: PrivateMultipartStorageAdapter,
  now = Date.now(),
): boolean {
  if (!validateAdapter(adapter) || !grant || typeof grant.url !== "string" ||
      !(grant.expiresAt instanceof Date) || !Number.isFinite(grant.expiresAt.getTime()) ||
      grant.expiresAt.getTime() <= now + 60_000 ||
      grant.expiresAt.getTime() > now + MULTIPART_GRANT_TTL_SECONDS * 1000) return false;
  try {
    const url = new URL(grant.url);
    return url.protocol === "https:" && adapter.allowedUploadOrigins.has(url.origin) &&
      !url.username && !url.password && !url.hash && url.pathname.length > 1;
  } catch { return false; }
}

/** Creates storage state only through a selected adapter. Any partial grant
 * failure triggers an abort; adapter errors are deliberately not propagated.
 */
export async function createGrantedMultipartUpload(
  adapter: PrivateMultipartStorageAdapter,
  input: { uploadId: string; expectedBytes: number; expectedSha256: string },
  now = Date.now(),
): Promise<CreatedMultipartUpload> {
  if (!validateAdapter(adapter)) throw new MultipartStorageError("adapter_invalid");
  const plan = planMultipart(input.uploadId, input.expectedBytes);
  if (!/^[0-9a-f]{64}$/.test(input.expectedSha256)) {
    throw new MultipartStorageError("adapter_invalid");
  }

  let storageUploadId: string | undefined;
  try {
    const created = await adapter.createMultipartUpload({
      key: plan.key,
      contentType: "video/mp4",
      expectedBytes: input.expectedBytes,
      expectedSha256: input.expectedSha256,
    });
    storageUploadId = created?.storageUploadId;
    if (typeof storageUploadId !== "string" || !uploadIdPattern.test(storageUploadId)) {
      throw new MultipartStorageError("storage_unavailable");
    }
    const parts = await Promise.all(plan.parts.map(async (part): Promise<GrantedPart> => {
      const grant = await adapter.createPartGrant({
        key: plan.key,
        storageUploadId: storageUploadId!,
        partNumber: part.partNumber,
        expectedBytes: part.bytes,
        ttlSeconds: MULTIPART_GRANT_TTL_SECONDS,
      });
      if (!validateSignedPartGrant(grant, adapter, now)) {
        throw new MultipartStorageError("grant_invalid");
      }
      return { ...part, url: grant.url, expiresAt: grant.expiresAt };
    }));
    return { storageUploadId, key: plan.key, parts };
  } catch (error) {
    if (storageUploadId) {
      try { await adapter.abortMultipartUpload({ key: plan.key, storageUploadId }); }
      catch { /* Keep storage/vendor details out of the caller response. */ }
    }
    if (error instanceof MultipartStorageError && error.kind === "grant_invalid") throw error;
    throw new MultipartStorageError("storage_unavailable");
  }
}

/** Completes only the part list read back from storage, then independently
 * streams and hashes the full private object before returning success.
 */
export async function completeVerifiedMultipartUpload(
  adapter: PrivateMultipartStorageAdapter,
  input: {
    uploadId: string;
    storageUploadId: string;
    expectedBytes: number;
    expectedSha256: string;
  },
): Promise<{ key: string; bytes: number; sha256: string }> {
  if (!validateAdapter(adapter) || !uploadIdPattern.test(input.storageUploadId)) {
    throw new MultipartStorageError("adapter_invalid");
  }
  const plan = planMultipart(input.uploadId, input.expectedBytes);
  const expectedSha256 = input.expectedSha256;
  if (!/^[0-9a-f]{64}$/.test(expectedSha256)) {
    throw new MultipartStorageError("adapter_invalid");
  }
  let completed = false;
  try {
    const parts = await adapter.listParts({ key: plan.key, storageUploadId: input.storageUploadId });
    if (!validateStorageParts(plan.parts, parts)) {
      throw new MultipartStorageError("parts_invalid");
    }
    await adapter.completeMultipartUpload({
      key: plan.key, storageUploadId: input.storageUploadId, parts,
    });
    completed = true;
    const object = await adapter.readPrivateObject({ key: plan.key });
    if (!await verifyQuarantineStream(
      input.uploadId, input.expectedBytes, expectedSha256, object,
    )) throw new MultipartStorageError("object_invalid");
    return { key: plan.key, bytes: input.expectedBytes, sha256: expectedSha256 };
  } catch (error) {
    if (completed) {
      try { await adapter.deletePrivateObject({ key: plan.key }); }
      catch { /* Quarantine cleanup worker remains responsible for failed deletes. */ }
    } else {
      try { await adapter.abortMultipartUpload({
        key: plan.key, storageUploadId: input.storageUploadId,
      }); } catch { /* Do not leak vendor errors. */ }
    }
    if (error instanceof MultipartStorageError &&
        (error.kind === "parts_invalid" || error.kind === "object_invalid")) throw error;
    throw new MultipartStorageError("storage_unavailable");
  }
}
