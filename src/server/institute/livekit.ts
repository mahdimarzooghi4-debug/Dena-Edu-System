import { AccessToken } from "livekit-server-sdk";

export type LiveKitServerConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

export class LiveKitConfigError extends Error {
  constructor() { super("livekit_unavailable"); }
}

export function readLiveKitServerConfig(
  env: Record<string, string | undefined> = process.env,
): LiveKitServerConfig {
  const url = env.LIVEKIT_URL;
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  if (env.DENA_LIVEKIT_ENABLED !== "1" || !url || !apiKey || !apiSecret || apiKey.length > 256 ||
      apiSecret.length < 32 || apiSecret.length > 512) throw new LiveKitConfigError();
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "wss:" || parsed.username || parsed.password ||
        parsed.search || parsed.hash || parsed.pathname !== "/") {
      throw new LiveKitConfigError();
    }
  } catch {
    throw new LiveKitConfigError();
  }
  return { url, apiKey, apiSecret };
}

/** Issues a short-lived, room-scoped LiveKit participant token. */
export async function createLiveKitJoinToken(input: {
  config: LiveKitServerConfig;
  callId: string;
  userId: string;
  ttlSeconds?: number;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(input.callId) ||
      !/^[0-9a-f-]{36}$/i.test(input.userId)) throw new LiveKitConfigError();
  const ttlSeconds = input.ttlSeconds ?? 300;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 600) {
    throw new LiveKitConfigError();
  }
  const accessToken = new AccessToken(input.config.apiKey, input.config.apiSecret, {
    identity: input.userId,
    ttl: ttlSeconds,
  });
  accessToken.addGrant({
    room: input.callId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const issuedAt = Date.now();
  return {
    token: await accessToken.toJwt(),
    expiresAt: new Date(issuedAt + ttlSeconds * 1000),
  };
}
