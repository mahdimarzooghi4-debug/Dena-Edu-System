import { denaAndroidPreview as preview } from "../../../../lib/dena-android-download";

export const dynamic = "force-dynamic";
export function GET(): Response {
  if (!(process.env.DENA_PUBLIC_ANDROID_APK_ENABLED === "1")) return new Response("Public APK distribution is not approved.", { status: 503, headers: { "cache-control": "no-store" } });
  return new Response(`${preview.sha256}  ${preview.name}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${preview.name}.sha256"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
