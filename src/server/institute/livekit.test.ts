import { describe, expect, it } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";
import { createLiveKitJoinToken, LiveKitConfigError, readLiveKitServerConfig } from "./livekit";

const config = {
  url: "wss://calls.example.test",
  apiKey: "dena-stage-key",
  apiSecret: "s".repeat(48),
};

describe("LiveKit service call credentials", () => {
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

  it("issues a five-minute participant JWT restricted to one call room", async () => {
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
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 299_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 301_000);
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
      ttlSeconds: 3_600,
    })).rejects.toThrow(LiveKitConfigError);
  });
});
