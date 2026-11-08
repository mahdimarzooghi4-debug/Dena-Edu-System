import { denaAndroidPreview as preview } from "../../../../lib/dena-android-download";

export function GET(): Response {
  return new Response(`${preview.sha256}  ${preview.name}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${preview.name}.sha256"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
