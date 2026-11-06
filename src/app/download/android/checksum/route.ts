import { denaAndroidPreview as preview } from "../../../../lib/dena-android-download";

export function GET(): Response {
  return new Response(preview.sha256 + "  dena-student-android-v0.1.1.apk\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": 'attachment; filename="dena-student-android-v0.1.1.apk.sha256"',
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
