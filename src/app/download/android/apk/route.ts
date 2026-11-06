import { createHash } from "node:crypto";
import { denaAndroidPreview as preview } from "@/lib/dena-android-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable(): Response {
  return new Response("APK download temporarily unavailable. Please retry later.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(): Promise<Response> {
  try {
    // The release is immutable. Proxying the bytes avoids requiring students
    // to access GitHub directly. Never proxy arbitrary request-supplied URLs.
    const upstream = await fetch(preview.sourceHref, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/octet-stream" },
    });
    if (!upstream.ok) return unavailable();
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength !== preview.size) return unavailable();
    const sha = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    if (sha !== preview.sha256) return unavailable();

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "application/vnd.android.package-archive",
        "content-disposition": 'attachment; filename="dena-student-android-v0.1.1.apk"',
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return unavailable();
  }
}
