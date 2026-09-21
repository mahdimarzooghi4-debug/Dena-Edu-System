import { afterEach, describe, expect, it } from "vitest";
import {
  configuredPrivateMediaOrigin, safeMediaRange,
} from "./private-media";

const before = { ...process.env };
afterEach(() => {
  for (const key of [
    "DENA_MEDIA_ENABLED", "DENA_PRIVATE_MEDIA_ORIGIN_URL",
    "DENA_PRIVATE_MEDIA_ORIGIN_TOKEN", "DENA_DB_INTEGRATION",
  ]) {
    const value = before[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("private media is disabled by default and never accepts client URLs", () => {
  it("rejects unconfigured and insecure remote origins", () => {
    process.env.DENA_MEDIA_ENABLED = "0";
    expect(configuredPrivateMediaOrigin()).toBeNull();
    process.env.DENA_MEDIA_ENABLED = "1";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "x".repeat(32);
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "http://media.example.test/";
    process.env.DENA_DB_INTEGRATION = "0";
    expect(configuredPrivateMediaOrigin()).toBeNull();
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL =
      "https://user:password@media.example.test/";
    expect(configuredPrivateMediaOrigin()).toBeNull();
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "https://media.example.test/?redirect=1";
    expect(configuredPrivateMediaOrigin()).toBeNull();
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "https://media.example.test/";
    expect(configuredPrivateMediaOrigin()?.origin.hostname).toBe("media.example.test");
  });

  it("permits HTTP strictly on isolated localhost integration origin", () => {
    process.env.DENA_MEDIA_ENABLED = "1";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "x".repeat(32);
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "http://127.0.0.1:4318/";
    process.env.DENA_DB_INTEGRATION = "0";
    expect(configuredPrivateMediaOrigin()).toBeNull();
    process.env.DENA_DB_INTEGRATION = "1";
    expect(configuredPrivateMediaOrigin()?.origin.port).toBe("4318");
  });

  it("allows a single byte-range only, not range splitting or injection", () => {
    expect(safeMediaRange(null)).toBeNull();
    expect(safeMediaRange("bytes=0-3")).toBe("bytes=0-3");
    expect(safeMediaRange("bytes=10-")).toBe("bytes=10-");
    expect(safeMediaRange("bytes=-100")).toBe("bytes=-100");
    for (const bad of [
      "bytes=0-4,6-8", "bytes=0-3\r\nAuthorization: bad",
      "items=0-3", "bytes=-", "bytes=abc", "bytes=0-3".repeat(30),
    ]) expect(safeMediaRange(bad)).toBe(false);
  });
});
