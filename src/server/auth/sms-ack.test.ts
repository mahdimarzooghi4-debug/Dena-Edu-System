import { describe, expect, it } from "vitest";
import { smsGatewayAccepted } from "./sms-ack";

const ack = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status, headers: { "Content-Type": "application/json" },
  });

describe("SMS gateway explicit acknowledgement", () => {
  it("accepts only an explicit JSON boolean from a successful response", async () => {
    expect(await smsGatewayAccepted(ack({ accepted: true }))).toBe(true);
    expect(await smsGatewayAccepted(ack({ accepted: true }, 202))).toBe(true);
  });

  it.each([
    [{ accepted: false }, 200],
    [{ accepted: "true" }, 200],
    [{ status: "accepted" }, 200],
    [null, 200],
    [["accepted"], 200],
    [{ accepted: true }, 400],
  ] as const)("fails closed for ambiguous or negative vendor response", async (value, status) => {
    expect(await smsGatewayAccepted(ack(value, status))).toBe(false);
  });

  it("rejects missing, HTML, invalid, and empty JSON responses", async () => {
    expect(await smsGatewayAccepted(new Response(null, { status: 204 }))).toBe(false);
    expect(await smsGatewayAccepted(new Response("<html>login</html>", {
      status: 200, headers: { "Content-Type": "text/html" },
    }))).toBe(false);
    expect(smsGatewayAccepted(new Response("{not-json", {
      status: 200, headers: { "Content-Type": "application/json" },
    }))).rejects.toThrow();
    expect(await smsGatewayAccepted(new Response(null, {
      status: 200, headers: { "Content-Type": "application/json" },
    }))).toBe(false);
  });

  it("rejects oversized declared and actual bodies instead of buffering them", async () => {
    const tooLong = "x".repeat(1025);
    expect(await smsGatewayAccepted(new Response(tooLong, {
      headers: { "Content-Type": "application/json", "Content-Length": "1025" },
    }))).toBe(false);
    expect(await smsGatewayAccepted(new Response(tooLong, {
      headers: { "Content-Type": "application/json", "Content-Length": "2" },
    }))).toBe(false);
    expect(await smsGatewayAccepted(new Response(tooLong, {
      headers: { "Content-Type": "application/json" },
    }))).toBe(false);
  });
});
