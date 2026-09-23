import { afterEach, describe, expect, it } from "vitest";
import {
  configuredPrivateMediaOrigin, safeMediaRange, validatedPrivateMediaResponse,
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

  it.each([
    "https://localhost/",
    "https://localhost./",
    "https://media.localhost/",
    "https://127.0.0.2/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[fe80::1]/",
    "https://169.254.169.254/",
    "https://0.0.0.0/",
  ])("rejects a local private-origin destination even under HTTPS: %s", url => {
    process.env.DENA_MEDIA_ENABLED = "1";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "x".repeat(32);
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = url;
    process.env.DENA_DB_INTEGRATION = "0";
    expect(configuredPrivateMediaOrigin()).toBeNull();
  });

  it("allows RFC1918 private media origins (not proof of egress isolation)", () => {
    process.env.DENA_MEDIA_ENABLED = "1";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "x".repeat(32);
    process.env.DENA_DB_INTEGRATION = "0";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "https://10.8.0.12/";
    expect(configuredPrivateMediaOrigin()?.origin.hostname).toBe("10.8.0.12");
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

  const originHeaders = (partial = false) => new Headers({
    "Content-Type": "video/mp4",
    "X-Dena-Private": "1",
    "Content-Length": partial ? "4" : "24",
    ...(partial ? { "Content-Range": "bytes 0-3/24" } : {}),
  });

  it("accepts only internally consistent private 200/206 responses", () => {
    expect(validatedPrivateMediaResponse(200, null, originHeaders()))
      .toEqual({ length: "24", range: null });
    expect(validatedPrivateMediaResponse(206, "bytes=0-3", originHeaders(true)))
      .toEqual({ length: "4", range: "bytes 0-3/24" });
    const open = originHeaders(true);
    open.set("Content-Range", "bytes 5-23/24");
    open.set("Content-Length", "19");
    expect(validatedPrivateMediaResponse(206, "bytes=5-", open))
      .toEqual({ length: "19", range: "bytes 5-23/24" });
    const suffix = originHeaders(true);
    suffix.set("Content-Range", "bytes 20-23/24");
    expect(validatedPrivateMediaResponse(206, "bytes=-4", suffix))
      .toEqual({ length: "4", range: "bytes 20-23/24" });
    const clipped = originHeaders(true);
    clipped.set("Content-Range", "bytes 20-23/24");
    expect(validatedPrivateMediaResponse(206, "bytes=20-999", clipped))
      .toEqual({ length: "4", range: "bytes 20-23/24" });
  });

  it.each([
    ["missing privacy marker", "X-Dena-Private", null, 206, "bytes=0-3"],
    ["untrusted media type", "Content-Type", "text/html", 206, "bytes=0-3"],
    ["missing length", "Content-Length", null, 206, "bytes=0-3"],
    ["malformed length", "Content-Length", "NaN", 206, "bytes=0-3"],
    ["mismatched response size", "Content-Length", "3", 206, "bytes=0-3"],
    ["malformed range", "Content-Range", "bytes */24", 206, "bytes=0-3"],
    ["wrong start", "Content-Range", "bytes 1-4/24", 206, "bytes=0-3"],
    ["impossible total", "Content-Range", "bytes 0-24/24", 206, "bytes=0-3"],
    ["unsafe integer", "Content-Range", "bytes 0-3/9007199254740993", 206, "bytes=0-3"],
    ["unsolicited full range", "Content-Range", "bytes 0-3/24", 200, null],
  ] as const)("rejects %s before proxying bytes", (_label, field, value, status, requested) => {
    const headers = originHeaders(status === 206);
    if (value === null) headers.delete(field);
    else headers.set(field, value);
    expect(validatedPrivateMediaResponse(status, requested, headers)).toBeNull();
  });

  it("rejects unsatisfied, altered or unsolicited upstream ranges", () => {
    expect(validatedPrivateMediaResponse(200, "bytes=0-3", originHeaders())).toBeNull();
    expect(validatedPrivateMediaResponse(206, null, originHeaders(true))).toBeNull();
    expect(validatedPrivateMediaResponse(206, "bytes=1-4", originHeaders(true))).toBeNull();
    expect(validatedPrivateMediaResponse(206, "bytes=-4", originHeaders(true))).toBeNull();
    expect(validatedPrivateMediaResponse(206, "bytes=0-999999999999999999999", originHeaders(true)))
      .toBeNull();
    expect(validatedPrivateMediaResponse(206, "bytes=0-0", originHeaders(true))).toBeNull();
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
