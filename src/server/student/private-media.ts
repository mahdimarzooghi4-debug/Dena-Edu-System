import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { privateMediaAssets } from "../../db/schema";
import { hasStudentEntitlement } from "./entitlement";

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
      origin.username || origin.password || origin.search || origin.hash ||
      origin.pathname !== "/" || origin.port === "0") return null;
  return { origin, token };
}

export function safeMediaRange(value: string | null): string | null | false {
  if (value === null) return null;
  if (!/^bytes=(?:\d+-\d*|-\d+)$/.test(value) || value.length > 80) return false;
  return value;
}
