import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstallButton } from "@/components/pwa/install-button";

export const metadata: Metadata = {
  title: "نصب اپ دانش‌آموز دنا",
  description: "نصب نسخهٔ وب اپ دانش‌آموز دنا روی گوشی",
  robots: { index: false, follow: false },
};

export default function StudentAppInstallPage() {
  return (
    <main id="main-content" dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f7f6fb] px-5 py-10 text-right">
      <section className="w-full max-w-xl rounded-[28px] border border-[#e5e1f0] bg-white p-7 shadow-[0_18px_55px_-30px_rgba(40,30,90,.35)] sm:p-10">
        <div className="flex items-center gap-4">
          <Image src="/app-icons/dena-student-192.png" width={72} height={72} alt="آیکون اپ دانش‌آموز دنا" className="rounded-2xl" />
          <div><p className="text-sm font-bold text-[#5b4ce2]">اپلیکیشن دانش‌آموز</p><h1 className="mt-1 text-2xl font-extrabold text-[#211b4f]">دنا را روی گوشی نصب کن</h1></div>
        </div>
        <p className="mt-6 text-sm leading-8 text-[#625d73]">نسخهٔ وب اپ بدون نیاز به فروشگاه برنامه نصب می‌شود و برای دریافت محتوای تازه به اینترنت نیاز دارد.</p>
        <div className="mt-6"><InstallButton /></div>
        <Link href="/student-demo" className="mt-7 inline-flex text-sm font-bold text-[#5b4ce2]">ورود به اپ دانش‌آموز ←</Link>
      </section>
    </main>
  );
}
