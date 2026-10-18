import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export type LiveKitServerConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

export class LiveKitConfigError extends Error {
  constructor() { super("livekit_unavailable"); }
}

/** One hour permits ordinary appointments and reconnects without keeping stale
 * self-hosted credentials valid for an entire day. This is not a call timer. */
export const LIVEKIT_JOIN_TOKEN_TTL_SECONDS = 60 * 60;

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

/** Issues a room-scoped LiveKit participant token. Token expiry controls how
 * long a new connection can be established; it does not end an active call. */
export async function createLiveKitJoinToken(input: {
  config: LiveKitServerConfig;
  callId: string;
  userId: string;
  ttlSeconds?: number;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(input.callId) ||
      !/^[0-9a-f-]{36}$/i.test(input.userId)) throw new LiveKitConfigError();
  const ttlSeconds = input.ttlSeconds ?? LIVEKIT_JOIN_TOKEN_TTL_SECONDS;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 600 || ttlSeconds > 21_600) {
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

/** Disconnects everyone from a call after its application lifecycle ends. */
export async function closeLiveKitRoom(callId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(callId)) throw new LiveKitConfigError();
  const config = readLiveKitServerConfig();
  const service = new RoomServiceClient(
    config.url.replace(/^wss:/, "https:"), config.apiKey, config.apiSecret,
  );
  const rooms = await service.listRooms([callId]);
  if (rooms.some((room) => room.name === callId)) await service.deleteRoom(callId);
}
