import type { Metadata } from "next";
import Link from "next/link";
import { DenaPublicLayout } from "../../../../components/marketing/dena-site-shell";

export const metadata: Metadata = { title: "ادامهٔ بازیابی حساب | دنا", robots: { index: false, follow: false } };

export default function RecoveryContinuePage() {
  return <DenaPublicLayout>
    <section className="dena-section" aria-labelledby="recovery-status-title">
      <div className="site-title-block">
        <span className="eyebrow">بازیابی حساب دانش‌آموزی</span>
        <h1 id="recovery-status-title">بازیابی حساب هنوز فعال نیست</h1>
        <p>در این پیش‌نمایش، فرایند تأیید هویت و بازیابی دسترسی نهایی نشده است؛ بنابراین هیچ شماره‌ای ارسال یا ثبت نشده و تغییری در حساب انجام نشده است.</p>
      </div>
      <div className="trust-cards">
        <article><h2>بازگشت به بازیابی</h2><p>بعد از فعال‌شدن روش تأیید هویت، می‌توانی این مسیر را ادامه بدهی.</p><Link href="/account/recovery" className="dena-button dena-button--primary">بازگشت به بازیابی حساب</Link></article>
        <article><h2>نیاز به راهنمایی داری؟</h2><p>برای پرسش عمومی با پشتیبانی دنا در ارتباط باش.</p><Link href="/support" className="dena-button dena-button--outline">رفتن به پشتیبانی</Link></article>
      </div>
    </section>
  </DenaPublicLayout>;
}
