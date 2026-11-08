import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach,describe,expect,it,vi } from "vitest";
import { GET as getApk } from "./apk/route";
import { GET as getChecksum } from "./checksum/route";
import { denaAndroidPreview as preview } from "../../../lib/dena-android-download";
vi.mock("node:fs/promises",()=>({readFile:vi.fn()}));
afterEach(()=>{vi.resetAllMocks();vi.unstubAllGlobals();});
describe("same-origin bundled Android download",()=>{
  it("serves the pinned APK and checksum without an upstream request",async()=>{
    const bytes=readFileSync(`public/downloads/${preview.localFile}`);
    vi.mocked(readFile).mockResolvedValue(bytes);
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
    const response=await getApk();expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(preview.name);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(bytes));
    expect(fetch).not.toHaveBeenCalled();
    expect(await getChecksum().text()).toContain(preview.sha256);
  });
  it("refuses missing, truncated and same-size corrupted APKs",async()=>{
    vi.mocked(readFile).mockRejectedValueOnce(new Error("missing"));
    expect((await getApk()).status).toBe(503);
    for(const data of[Buffer.from("error page"),Buffer.alloc(preview.size)]) {
      vi.mocked(readFile).mockResolvedValueOnce(data);
      const response=await getApk();expect(response.status).toBe(503);
      expect(response.headers.get("location")).toBeNull();expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});
