import type { Metadata } from "next";
import { denaAndroidPreview } from "@/lib/dena-android-download";

export const metadata: Metadata = {
  title: "دانلود اپ اندروید دنا",
  description: "دانلود مستقیم اپ اندروید دانش‌آموز دنا",
};

export default function AndroidDownloadPage() {
  return (
    <main id="main-content" dir="rtl" className="flex min-h-[100dvh] items-center justify-center bg-[#f7f6fb] px-5 py-10">
      <a
        href={denaAndroidPreview.href}
        download={denaAndroidPreview.name}
        className="inline-flex min-h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-[#5b4ce2] px-7 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#5b4ce2]/20 transition-colors hover:bg-[#4838be] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#5b4ce2]"
      >
        دانلود اپ اندروید دنا
      </a>
    </main>
  );
}
