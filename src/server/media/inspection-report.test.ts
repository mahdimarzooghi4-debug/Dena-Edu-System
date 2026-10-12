import { describe, expect, it } from "vitest";
import { MAX_INSPECTION_REPORT_BYTES, readBoundedInspectionReport } from "./inspection-report";

const json = (data: string, extra: Record<string, string> = {}) =>
  new Response(data, { status: 200, headers: {
    "Content-Type": "application/json; charset=utf-8", ...extra,
  } });

describe("bounded private inspection reports", () => {
  it("accepts a small JSON object, leaving attestation verification to its signer", async () => {
    expect(await readBoundedInspectionReport(json('{"version":1,"signature":"test"}')))
      .toEqual({ version: 1, signature: "test" });
  });

  it("rejects an oversized declared or streaming response without parsing it", async () => {
    const oversized = JSON.stringify({ padding: "p".repeat(MAX_INSPECTION_REPORT_BYTES) });
    expect(await readBoundedInspectionReport(json(oversized, {
      "Content-Length": String(Buffer.byteLength(oversized)),
    }))).toBeNull();
    expect(await readBoundedInspectionReport(json(oversized))).toBeNull();
  });

  it("rejects body-length disagreement and invalid declared lengths", async () => {
    expect(await readBoundedInspectionReport(json("{}", { "Content-Length": "9" })))
      .toBeNull();
    expect(await readBoundedInspectionReport(json("{}", { "Content-Length": "-1" })))
      .toBeNull();
    expect(await readBoundedInspectionReport(json("{}", { "Content-Length": "NaN" })))
      .toBeNull();
  });

  it("rejects malformed, empty, non-object or wrong content-type responses", async () => {
    for (const body of ["", "{bad json", "null", "[]", "true"]) {
      expect(await readBoundedInspectionReport(json(body))).toBeNull();
    }
    expect(await readBoundedInspectionReport(new Response("{}", { status: 200,
      headers: { "Content-Type": "text/html" },
    }))).toBeNull();
    expect(await readBoundedInspectionReport(json("{}", {
      "Content-Type": "text/plain",
    }))).toBeNull();
    expect(await readBoundedInspectionReport(new Response(null, { status: 204 })))
      .toBeNull();
  });
});
