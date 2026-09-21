import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card } from "../../components/ui/card";
import { MobileSignIn } from "../../components/auth/mobile-sign-in";

export const metadata: Metadata = {
  title: "ورود و ثبت‌نام | دنا",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const enabled = process.env.DENA_SMS_ENABLED === "1" &&
    Boolean(process.env.DENA_SMS_GATEWAY_URL && process.env.DENA_SMS_GATEWAY_TOKEN &&
    process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
  return (
    <main id="main-content" className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-7 md:px-10 md:py-12">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="صفحه اصلی دنا">
          <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        </Link>
        <Link href="/" className="text-sm font-semibold text-dena-brand hover:underline">بازگشت به صفحه اصلی</Link>
      </header>
      <div className="grid flex-1 items-center gap-8 py-10 md:grid-cols-[1fr_1.1fr] md:gap-14">
        <section className="order-2 rounded-[24px] bg-dena-lavender p-7 md:order-1 md:p-10">
          <p className="text-sm font-bold text-dena-brand">دنا · دانش‌آموزان نوآفرین ایران</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-relaxed text-dena-deep md:text-4xl">
            یادگیری، با یک ورود امن آغاز می‌شود
          </h1>
          <p className="mt-4 text-sm leading-8 text-dena-ink md:text-base">
            یک حساب برای ورود به فضای مجاز خود در دنا. شماره موبایل تأییدشده هویت شما را مشخص می‌کند؛
            دسترسی مؤسسه، ارائه‌دهنده، سازمان، خیر یا ادمین از فرایند تأیید مستقل صادر می‌شود.
          </p>
          <p className="mt-6 rounded-xl bg-white/75 p-4 text-xs leading-7 text-dena-muted">
            ورود به سامانه به‌تنهایی مجوز شرکت در دوره، صدور مجوز آموزشی یا دسترسی به اطلاعات دیگران نیست.
          </p>
        </section>
        <Card className="order-1 rounded-[24px] p-6 shadow-sm md:order-2 md:p-9" aria-labelledby="sign-in-title">
          <p className="text-xs font-bold text-dena-brand">حساب کاربری دنا</p>
          <h2 id="sign-in-title" className="mt-3 text-2xl font-extrabold">ورود یا ثبت‌نام</h2>
          <p className="mb-7 mt-3 text-sm leading-7 text-dena-muted">
            شماره موبایل خود را وارد کنید تا کد یک‌بارمصرف دریافت کنید.
          </p>
          <MobileSignIn enabled={enabled} />
        </Card>
      </div>
      <footer className="border-t border-dena-border py-5 text-xs leading-7 text-dena-muted">
        دنا مجوز رسمی فعالیت آموزشی صادر نمی‌کند؛ اعتبار و نظارت هر دوره به مؤسسه و ارائه‌دهنده مسئول آن وابسته است.
      </footer>
    </main>
  );
}
