import { describe, expect, it } from "vitest";
import {
  readFormDataAtMost, readRequestBodyAtMost, readRequestTextAtMost, RequestBodyLimitError,
} from "./bounded-request-body";

describe("bounded request-body readers", () => {
  it("stops a streaming request when the byte cap is crossed", async () => {
    let chunks = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunks += 1;
        controller.enqueue(new Uint8Array(4));
        if (chunks === 3) controller.close();
      },
      cancel() { cancelled = true; },
    });
    const request = new Request("https://example.test/upload", {
      method: "POST", body: stream, duplex: "half",
    } as RequestInit);

    await expect(readRequestBodyAtMost(request, 6)).rejects.toBeInstanceOf(RequestBodyLimitError);
    expect(chunks).toBe(2);
    expect(cancelled).toBe(true);
  });

  it("parses bounded multipart data without relying on Content-Length", async () => {
    const form = new FormData();
    form.append("organizationId", "organization-fixture");
    form.append("guardianConsentConfirmed", "true");
    form.append("file", new Blob(["firstName\nSara"], { type: "text/csv" }), "students.csv");
    const request = new Request("https://example.test/import", { method: "POST", body: form });

    const parsed = await readFormDataAtMost(request, 1024);
    expect(parsed.get("organizationId")).toBe("organization-fixture");
    expect(parsed.get("guardianConsentConfirmed")).toBe("true");
    expect((parsed.get("file") as File).name).toBe("students.csv");
  });

  it("applies the text cap to UTF-8 bytes and rejects malformed encoding", async () => {
    const textRequest = new Request("https://example.test/intake", {
      method: "POST", body: "سلام",
    });
    await expect(readRequestTextAtMost(textRequest, 7)).rejects.toBeInstanceOf(RequestBodyLimitError);

    const invalidUtf8 = new Request("https://example.test/intake", {
      method: "POST", body: new Uint8Array([0xff]),
    });
    await expect(readRequestTextAtMost(invalidUtf8, 8)).rejects.toThrow();
  });
});
