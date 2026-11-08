import Link from "next/link";
import type { Metadata } from "next";
import { denaAndroidPreview } from "@/lib/dena-android-download";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اپ اندروید دنا", robots: { index: false, follow: false } };

export default function AndroidDownloadPage() {
  const enabled = process.env.DENA_PUBLIC_ANDROID_APK_ENABLED === "1";
  return (
    <main id="main-content" dir="rtl" className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#f7f6fb] px-5 py-10 text-center">
      {enabled ? (
        <a href={denaAndroidPreview.href} download={denaAndroidPreview.name} className="inline-flex min-h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-[#5b4ce2] px-7 py-4 text-base font-bold text-white">
          دانلود اپ اندروید دنا
        </a>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold text-[#352b68]">انتشار عمومی اپ اندروید هنوز تأیید نشده است</h1>
          <p className="max-w-md text-sm leading-8 text-[#756f83]">فایل نصب از این سایت قابل دریافت نیست. می‌توانید نسخه نمایشی دانش‌آموز را در مرورگر ببینید.</p>
          <Link href="/student-demo" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#5b4ce2] px-6 py-3 text-sm font-bold text-white">
            مشاهده نسخه نمایشی دنا
          </Link>
        </>
      )}
    </main>
  );
}
