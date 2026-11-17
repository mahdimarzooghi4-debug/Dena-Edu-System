import type { Metadata } from "next";
import { denaAndroidPreview } from "@/lib/dena-android-download";

export const metadata: Metadata = {
  title: "دریافت اپ دانش‌آموز دنا",
  description: "دریافت نسخهٔ اندروید یا نصب وب‌اپ دانش‌آموز دنا",
};

export default function AndroidDownloadPage() {
  return (
    <main id="main-content" dir="rtl" className="min-h-[100dvh] bg-[#f7f6fb] px-5 py-12 text-right sm:py-16">
      <section className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-[#eeeaff] px-4 py-2 text-xs font-bold text-[#5b4ce2]">اپ دانش‌آموز دنا</span>
          <h1 className="mt-5 text-3xl font-extrabold text-[#211b4f] sm:text-4xl">دنا را روی گوشی همراهت داشته باش</h1>
          <p className="mt-4 text-sm leading-8 text-[#756f83]">یکی از روش‌های دریافت را انتخاب کن. هر دو نسخه برای نمایش اپ دانش‌آموز طراحی شده‌اند و برای دریافت محتوای تازه به اینترنت نیاز دارند.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="flex flex-col rounded-[26px] border border-[#e5e1f0] bg-white p-6 shadow-[0_16px_45px_-32px_rgba(40,30,90,.35)] sm:p-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#5b4ce2]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M10 18h4M12 6v7m0 0 3-3m-3 3-3-3"/></svg>
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-[#211b4f]">نسخهٔ اندروید</h2>
            <p className="mt-2 text-sm leading-7 text-[#756f83]">فایل نصب مستقیم برای گوشی‌های اندرویدی.</p>
            <ul className="mt-4 space-y-2 text-sm text-[#625d73]">
              <li>حداقل نسخهٔ موردنیاز: {denaAndroidPreview.minAndroid}</li>
              <li>نسخهٔ آزمایشی: {denaAndroidPreview.version}</li>
              <li>برای نمایش درس‌ها اتصال اینترنت لازم است.</li>
            </ul>
            <a href={denaAndroidPreview.href} download={denaAndroidPreview.name} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#5b4ce2] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4838be] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#5b4ce2]">
              دانلود اپ اندروید دنا
            </a>
            <p className="mt-3 text-xs leading-6 text-[#827c91]">این فایل نسخهٔ آزمایشی است و از فروشگاه رسمی منتشر نشده است.</p>
          </article>

          <article className="flex flex-col rounded-[26px] border border-[#e5e1f0] bg-white p-6 shadow-[0_16px_45px_-32px_rgba(40,30,90,.35)] sm:p-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#e9faf4] text-[#13a982]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="15" rx="2"/><path d="M8 22h8m-4-3v3M8 9h8m-8 4h5"/></svg>
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-[#211b4f]">نسخهٔ وب‌اپ (PWA)</h2>
            <p className="mt-2 text-sm leading-7 text-[#756f83]">بدون فایل نصب، اپ را از مرورگر باز و به صفحهٔ اصلی گوشی اضافه کن.</p>
            <ul className="mt-4 space-y-2 text-sm text-[#625d73]">
              <li>قابل استفاده در اندروید و آیفون</li>
              <li>نصب از مرورگر، بدون مراجعه به فروشگاه</li>
              <li>برای دریافت محتوای آموزشی اتصال اینترنت لازم است.</li>
            </ul>
            <a href="https://dena-student-demo.onrender.com/student-demo/install" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-[#5b4ce2] bg-[#f7f5ff] px-5 py-3 text-sm font-bold text-[#4b3ad2] transition hover:bg-[#eeeaff] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#5b4ce2]">
              نصب نسخهٔ وب‌اپ
            </a>
            <a href="https://dena-student-demo.onrender.com/student-demo" className="mt-3 text-center text-sm font-bold text-[#5b4ce2] hover:underline">مشاهدهٔ اپ در مرورگر</a>
          </article>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-7 text-[#827c91]">اطلاعات داخل نسخهٔ نمایشی نمونه است. ورود پیامکی و پرداخت آنلاین در این نسخه فعال نیست.</p>
      </section>
    </main>
  );
}
