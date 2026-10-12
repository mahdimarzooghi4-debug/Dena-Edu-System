import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card } from "../../components/ui/card";
import { MobileSignIn } from "../../components/auth/mobile-sign-in";
import "../../components/marketing/dena-homepage.css";

export const metadata: Metadata = {
  title: "ورود و ثبت‌نام | دنا",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const enabled = process.env.DENA_SMS_ENABLED === "1" &&
    Boolean(process.env.DENA_SMS_GATEWAY_URL && process.env.DENA_SMS_GATEWAY_TOKEN &&
    process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
  return (
    <main id="main-content" className="dena-auth-page">
      <header className="dena-auth-header">
        <Link href="/" aria-label="صفحه اصلی دنا">
          <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        </Link>
        <Link href="/" className="text-sm font-semibold text-dena-brand hover:underline">بازگشت به صفحه اصلی</Link>
      </header>
      <div className="dena-auth-stage">
        <section className="dena-auth-illustration" aria-label="اکوسیستم آموزشی دنا">
          <div className="auth-network-art" aria-hidden="true">
            <svg viewBox="0 0 520 420" role="presentation">
              <path className="auth-network-line" d="M260 96 122 186m138-90 138 90M122 186l44 136m88-226 0 226m138-136-44 136M122 186h276M166 322h188" />
              <circle className="auth-network-orbit" cx="260" cy="209" r="148" />
              <g className="auth-network-node auth-network-node--main"><circle cx="260" cy="96" r="43"/><path d="M242 99h36m-18-18v36"/><text x="260" y="158">یادگیری</text></g>
              <g className="auth-network-node"><circle cx="122" cy="186" r="31"/><path d="M112 189h20m-10-10v20"/><text x="122" y="238">دانش‌آموز</text></g>
              <g className="auth-network-node"><circle cx="398" cy="186" r="31"/><path d="M386 194h24m-20-14h16"/><text x="398" y="238">مؤسسه</text></g>
              <g className="auth-network-node"><circle cx="166" cy="322" r="31"/><path d="M154 327h24m-12-15v20"/><text x="166" y="374">آزمون</text></g>
              <g className="auth-network-node"><circle cx="354" cy="322" r="31"/><path d="m342 324 8 8 17-20"/><text x="354" y="374">رشد</text></g>
            </svg>
          </div>
          <p>یادگیری تنها نیست؛ رشد همراه است.</p>
        </section>
        <Card className="dena-auth-card" aria-labelledby="sign-in-title">
          <p className="text-xs font-bold text-dena-brand">حساب کاربری دنا</p>
          <h2 id="sign-in-title" className="mt-3 text-2xl font-extrabold">ورود یا ثبت‌نام</h2>
          <p className="mb-7 mt-3 text-sm leading-7 text-dena-muted">
            شماره موبایل خود را وارد کنید تا کد یک‌بارمصرف دریافت کنید.
          </p>
          <MobileSignIn enabled={enabled} />
          <div className="auth-form-links"><Link href="/account/recovery">بازیابی حساب</Link><Link href="/signup">ساخت حساب جدید</Link></div>
        </Card>
      </div>
      <footer className="dena-auth-footer">
        دنا مجوز رسمی فعالیت آموزشی صادر نمی‌کند؛ اعتبار و نظارت هر دوره به مؤسسه و ارائه‌دهنده مسئول آن وابسته است.
      </footer>
    </main>
  );
}
