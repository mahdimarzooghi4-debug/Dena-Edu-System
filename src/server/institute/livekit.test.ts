import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";
import {
  closeLiveKitRoom, createLiveKitJoinToken, LiveKitConfigError, LIVEKIT_JOIN_TOKEN_TTL_SECONDS,
  readLiveKitServerConfig,
} from "./livekit";

const roomService = vi.hoisted(() => ({
  listRooms: vi.fn(),
  deleteRoom: vi.fn(),
}));
vi.mock("livekit-server-sdk", async (importOriginal) => {
  const sdk = await importOriginal<typeof import("livekit-server-sdk")>();
  return {
    ...sdk,
    RoomServiceClient: class {
      constructor() { return roomService as never; }
    },
  };
});

const config = {
  url: "wss://calls.example.test",
  apiKey: "dena-stage-key",
  apiSecret: "s".repeat(48),
};

describe("LiveKit service call credentials", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires secure, complete server configuration", () => {
    expect(readLiveKitServerConfig({
      DENA_LIVEKIT_ENABLED: "1",
      LIVEKIT_URL: config.url,
      LIVEKIT_API_KEY: config.apiKey,
      LIVEKIT_API_SECRET: config.apiSecret,
    })).toEqual(config);
    expect(() => readLiveKitServerConfig({
      DENA_LIVEKIT_ENABLED: "1",
      LIVEKIT_URL: "http://calls.example.test",
      LIVEKIT_API_KEY: config.apiKey,
      LIVEKIT_API_SECRET: config.apiSecret,
    })).toThrow(LiveKitConfigError);
    expect(() => readLiveKitServerConfig({
      DENA_LIVEKIT_ENABLED: "1",
      LIVEKIT_URL: config.url, LIVEKIT_API_KEY: config.apiKey, LIVEKIT_API_SECRET: "short",
    })).toThrow(LiveKitConfigError);
    expect(() => readLiveKitServerConfig({
      DENA_LIVEKIT_ENABLED: "0", LIVEKIT_URL: config.url,
      LIVEKIT_API_KEY: config.apiKey, LIVEKIT_API_SECRET: config.apiSecret,
    })).toThrow(LiveKitConfigError);
  });

  it("issues an hour-long participant JWT restricted to one call room", async () => {
    const callId = "123e4567-e89b-42d3-a456-426614174000";
    const userId = "123e4567-e89b-42d3-a456-426614174001";
    const before = Date.now();
    const result = await createLiveKitJoinToken({ config, callId, userId });
    const claims = await new TokenVerifier(config.apiKey, config.apiSecret).verify(result.token);
    expect(claims).toMatchObject({
      iss: config.apiKey,
      sub: userId,
      exp: expect.any(Number),
      video: {
        room: callId, roomJoin: true, canPublish: true, canSubscribe: true,
        canPublishData: true,
      },
    });
    expect(typeof claims.exp).toBe("number");
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3_599_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 3_601_000);
    expect(Number(claims.exp) * 1000).toBeGreaterThanOrEqual(result.expiresAt.getTime() - 1000);
    await expect(new TokenVerifier(config.apiKey, "x".repeat(48)).verify(result.token))
      .rejects.toThrow();
  });

  it("rejects overlong tokens and invalid room identities", async () => {
    await expect(createLiveKitJoinToken({
      config, callId: "not-a-uuid", userId: "123e4567-e89b-42d3-a456-426614174001",
    })).rejects.toThrow(LiveKitConfigError);
    await expect(createLiveKitJoinToken({
      config,
      callId: "123e4567-e89b-42d3-a456-426614174000",
      userId: "123e4567-e89b-42d3-a456-426614174001",
      ttlSeconds: 21_601,
    })).rejects.toThrow(LiveKitConfigError);
    expect(LIVEKIT_JOIN_TOKEN_TTL_SECONDS).toBe(3_600);
  });

  it("deletes the active media room so ending a call disconnects participants", async () => {
    vi.stubEnv("DENA_LIVEKIT_ENABLED", "1");
    vi.stubEnv("LIVEKIT_URL", config.url);
    vi.stubEnv("LIVEKIT_API_KEY", config.apiKey);
    vi.stubEnv("LIVEKIT_API_SECRET", config.apiSecret);
    roomService.listRooms.mockResolvedValue([{ name: "123e4567-e89b-42d3-a456-426614174000" }]);
    roomService.deleteRoom.mockResolvedValue(undefined);

    await closeLiveKitRoom("123e4567-e89b-42d3-a456-426614174000");

    expect(roomService.listRooms).toHaveBeenCalledWith(["123e4567-e89b-42d3-a456-426614174000"]);
    expect(roomService.deleteRoom).toHaveBeenCalledWith("123e4567-e89b-42d3-a456-426614174000");
  });
});
