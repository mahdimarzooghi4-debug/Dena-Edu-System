import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getApk } from "./apk/route";
import { GET as getChecksum } from "./checksum/route";
import { denaAndroidPreview as preview } from "../../../lib/dena-android-download";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("public Android APK release gate", () => {
  it("fails closed by default without reading bytes", async () => {
    vi.stubEnv("DENA_PUBLIC_ANDROID_APK_ENABLED", "");
    expect((await getApk()).status).toBe(503);
    expect((await getChecksum()).status).toBe(503);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("verifies the private pinned APK after explicit activation", async () => {
    vi.stubEnv("DENA_PUBLIC_ANDROID_APK_ENABLED", "1");
    const bytes = readFileSync(`private-assets/android/${preview.localFile}`);
    vi.mocked(readFile).mockResolvedValue(bytes);
    const response = await getApk();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(preview.name);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(bytes));
    expect(await getChecksum().text()).toContain(preview.sha256);
  });

  it("denies missing, truncated and corrupt artifacts even if enabled", async () => {
    vi.stubEnv("DENA_PUBLIC_ANDROID_APK_ENABLED", "1");
    vi.mocked(readFile).mockRejectedValueOnce(new Error("missing"));
    expect((await getApk()).status).toBe(503);
    for (const bytes of [Buffer.from("error page"), Buffer.alloc(preview.size)]) {
      vi.mocked(readFile).mockResolvedValueOnce(bytes);
      const response = await getApk();
      expect(response.status).toBe(503);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});
