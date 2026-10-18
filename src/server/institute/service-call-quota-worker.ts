import { timingSafeEqual } from "node:crypto";

export function secureServiceCallQuotaWorkerToken(authorization: string | null) {
  const token = process.env.DENA_LIVEKIT_QUOTA_WORKER_TOKEN;
  if (process.env.DENA_LIVEKIT_ENABLED !== "1" || !token || token.length < 32 ||
      token === process.env.LIVEKIT_API_SECRET || !authorization?.startsWith("Bearer ")) {
    return false;
  }
  const provided = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(token);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
