import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { denaAndroidPreview as preview } from "../../../../lib/dena-android-download";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function unavailable():Response {
  return new Response("APK download temporarily unavailable. Please retry later.",{
    status:503,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"},
  });
}
export async function GET():Promise<Response> {
  if (!(process.env.DENA_PUBLIC_ANDROID_APK_ENABLED === "1")) return unavailable();
  try {
    const bytes=await readFile(join(process.cwd(),"private-assets","android",preview.localFile));
    if(bytes.byteLength!==preview.size||createHash("sha256").update(bytes).digest("hex")!==preview.sha256) return unavailable();
    return new Response(new Uint8Array(bytes),{status:200,headers:{
      "content-type":"application/vnd.android.package-archive",
      "content-disposition":`attachment; filename="${preview.name}"`,
      "content-length":String(bytes.byteLength),"cache-control":"no-store","x-content-type-options":"nosniff",
    }});
  } catch {return unavailable();}
}
