import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getApk } from "./apk/route";
import { GET as getChecksum } from "./checksum/route";

afterEach(() => vi.unstubAllGlobals());

describe("Android APK download from the Dena domain", () => {
  it("provides the pinned SHA-256 file from the same origin", async () => {
    const response = getChecksum();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(".apk.sha256");
    expect(await response.text()).toContain("381750defd2a7e9cd54370c94c0aaadf77651f7c4ae09748fccfbdf345d7abc8");
  });

  it("never redirects visitors to GitHub or serves upstream errors as APKs", async () => {
    const mock = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));
    vi.stubGlobal("fetch", mock);
    const response = await getApk();
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mock).toHaveBeenCalledOnce();
    expect(mock.mock.calls[0][0]).toMatch(/^https:\/\/github\.com\//);
  });

  it("rejects unexpected data instead of allowing a fake APK download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("html login", { status: 200 })));
    const response = await getApk();
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/plain");
  });
});
