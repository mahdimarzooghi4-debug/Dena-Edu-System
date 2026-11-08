import { NextResponse } from "next/server";
import { isStudentDemoEnabled } from "../../server/student/demo-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  if (!isStudentDemoEnabled()) return new Response(null, { status: 404 });
  return NextResponse.json({
    id: "/student/demo",
    name: "دنا | اپ دانش‌آموز آزمایشی",
    short_name: "دنا آزمایشی",
    description: "تجربهٔ آموزشی دنا با داده‌های نمونه",
    start_url: "/student/demo",
    scope: "/student/",
    lang: "fa",
    dir: "rtl",
    display: "standalone",
    background_color: "#f7f6fb",
    theme_color: "#5b4ce2",
    icons: [
      { src: "/student-app-icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
    ],
  }, { headers: { "Cache-Control": "no-store, private" } });
}
