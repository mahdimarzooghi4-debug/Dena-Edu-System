import { afterEach, describe, expect, it } from "vitest";
import {
  ingestAvailable, isValidMp4Header, MAX_PILOT_UPLOAD_BYTES,
  secureWorkerToken,
} from "./ingest";

const initial = { ...process.env };
afterEach(() => {
  for (const key of [
    "DENA_INGEST_ENABLED", "DENA_MEDIA_ENABLED", "DENA_DB_INTEGRATION",
    "DENA_PRIVATE_MEDIA_ORIGIN_URL", "DENA_PRIVATE_MEDIA_ORIGIN_TOKEN",
    "DENA_MEDIA_PROCESSOR_ENABLED", "DENA_MEDIA_PROCESSOR_TOKEN",
  ]) {
    if (initial[key] === undefined) delete process.env[key];
    else process.env[key] = initial[key];
  }
});

describe("pilot ingest deny-by-default contracts", () => {
  it("does not enable upload based on an arbitrary URL or on partial config", () => {
    process.env.DENA_INGEST_ENABLED = "0";
    expect(ingestAvailable()).toBe(false);
    process.env.DENA_INGEST_ENABLED = "1";
    process.env.DENA_MEDIA_ENABLED = "0";
    expect(ingestAvailable()).toBe(false);
    process.env.DENA_MEDIA_ENABLED = "1";
    process.env.DENA_DB_INTEGRATION = "0";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "http://127.0.0.1:4318/";
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "x".repeat(32);
    expect(ingestAvailable()).toBe(false);
    process.env.DENA_DB_INTEGRATION = "1";
    expect(ingestAvailable()).toBe(true);
    expect(MAX_PILOT_UPLOAD_BYTES).toBe(8 * 1024 * 1024);
  });

  it("checks the MP4 box without pretending to scan or transcode", () => {
    const ftyp = Buffer.from(
      "00000018667479706d7034326d70343269736f6d00000000", "hex",
    );
    expect(isValidMp4Header(ftyp)).toBe(true);
    expect(isValidMp4Header(Buffer.from("hello".repeat(7)))).toBe(false);
    expect(isValidMp4Header(Buffer.from(
      "00000018667479706d7034326d703432", "hex",
    ))).toBe(false);
  });

  it("rejects wrong/missing/disabled worker token independently of storage token", () => {
    process.env.DENA_MEDIA_PROCESSOR_ENABLED = "0";
    process.env.DENA_MEDIA_PROCESSOR_TOKEN = "worker".repeat(8);
    const credential = `Bearer ${process.env.DENA_MEDIA_PROCESSOR_TOKEN}`;
    expect(secureWorkerToken(credential)).toBe(false);
    process.env.DENA_MEDIA_PROCESSOR_ENABLED = "1";
    expect(secureWorkerToken(null)).toBe(false);
    expect(secureWorkerToken("Bearer x".repeat(8))).toBe(false);
    expect(secureWorkerToken(credential)).toBe(true);
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN =
      process.env.DENA_MEDIA_PROCESSOR_TOKEN;
    expect(secureWorkerToken(credential)).toBe(false);
    process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "origin".repeat(8);
    expect(secureWorkerToken(credential)).toBe(true);
    expect(secureWorkerToken(credential + "x")).toBe(false);
  });
});
