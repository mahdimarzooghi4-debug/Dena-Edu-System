import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { privateMediaAssets } from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";
import { unsafeServiceHostname } from "../ops/unsafe-service-host";

export type ApprovedPrivateAsset = { objectKey: string };

export async function getApprovedPrivateAsset(
  userId: string, courseId: string, assetId: string,
): Promise<ApprovedPrivateAsset | null> {
  // Enrollment is checked again on every byte-range fetch. A valid asset UUID
  // alone, even copied from another student, is never a bearer capability.
  if (!await hasStudentEntitlement(userId, courseId)) return null;
  const [asset] = await getDb().select({
    objectKey: privateMediaAssets.objectKey,
  }).from(privateMediaAssets).where(and(
    eq(privateMediaAssets.id, assetId),
    eq(privateMediaAssets.courseId, courseId),
    eq(privateMediaAssets.status, "ready"),
  )).limit(1);
  // Fail closed on a malformed/legacy object path (no arbitrary URL injection).
  if (!asset || asset.objectKey !== `${courseId}/${assetId}.mp4`) return null;
  return asset;
}

export function configuredPrivateMediaOrigin(): {
  origin: URL; token: string;
} | null {
  if (process.env.DENA_MEDIA_ENABLED !== "1") return null;
  const rawUrl = process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL;
  const token = process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN;
  if (!rawUrl || !token || token.length < 16) return null;
  let origin: URL;
  try { origin = new URL(rawUrl); } catch { return null; }
  const localOnly = process.env.DENA_DB_INTEGRATION === "1" &&
    origin.protocol === "http:" && origin.hostname === "127.0.0.1";
  if ((origin.protocol !== "https:" && !localOnly) ||
      !origin.hostname || (!localOnly && unsafeServiceHostname(origin.hostname)) ||
      origin.username || origin.password || origin.search || origin.hash ||
      origin.pathname !== "/" || origin.port === "0") return null;
  return { origin, token };
}

export function safeMediaRange(value: string | null): string | null | false {
  if (value === null) return null;
  if (!/^bytes=(?:\d+-\d*|-\d+)$/.test(value) || value.length > 80) return false;
  return value;
}


/**
 * Validate private-origin response framing BEFORE streaming to a student.
 * Headers do not attest the bytes' integrity; the ingest verifier and a real
 * immutable private store remain separate release gates. This catches broken
 * or mismatched Range replies without buffering the MP4 in the app server.
 */
export function validatedPrivateMediaResponse(
  status: number, requestedRange: string | null, responseHeaders: Headers,
): { length: string; range: string | null } | null {
  if (responseHeaders.get("x-dena-private") !== "1" ||
      responseHeaders.get("content-type")?.split(";")[0].trim() !== "video/mp4") {
    return null;
  }
  const rawLength = responseHeaders.get("content-length");
  if (!rawLength || !/^(?:0|[1-9]\d*)$/.test(rawLength)) return null;
  const length = Number(rawLength);
  if (!Number.isSafeInteger(length) || length < 1) return null;

  const range = responseHeaders.get("content-range");
  if (status === 200 && requestedRange === null && range === null) {
    return { length: rawLength, range: null };
  }
  if (status !== 206 || requestedRange === null || range === null) return null;
  const parsed = /^bytes (0|[1-9]\d*)-(0|[1-9]\d*)\/([1-9]\d*)$/.exec(range);
  if (!parsed) return null;
  const [from, to, total] = parsed.slice(1).map(Number);
  if (![from, to, total].every(Number.isSafeInteger) ||
      total < 1 || from > to || to >= total || to - from + 1 !== length) return null;

  const explicit = /^bytes=(\d+)-(\d*)$/.exec(requestedRange);
  if (explicit) {
    const start = Number(explicit[1]);
    const end = explicit[2] ? Number(explicit[2]) : total - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start >= total || end < start ||
        from !== start || to !== Math.min(end, total - 1)) return null;
  } else {
    const suffix = /^bytes=-(\d+)$/.exec(requestedRange);
    if (!suffix) return null;
    const count = Number(suffix[1]);
    if (!Number.isSafeInteger(count) || count < 1 ||
        from !== Math.max(0, total - count) || to !== total - 1) return null;
  }
  return { length: rawLength, range };
}
