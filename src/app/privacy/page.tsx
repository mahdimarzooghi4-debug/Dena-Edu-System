import type { Metadata } from "next";
import Link from "next/link";
import { DenaPublicLayout } from "../../components/marketing/dena-site-shell";

export const metadata: Metadata = { title: "حریم خصوصی | دنا" };

export default function PrivacyPage() {
  return <DenaPublicLayout>
    <section className="dena-section" aria-labelledby="privacy-title">
      <div className="site-title-block">
        <span className="eyebrow">راهنمای دنا</span>
        <h1 id="privacy-title">حریم خصوصی</h1>
        <p>دنا برای ارائهٔ تجربهٔ آموزشی، اطلاعاتی را که کاربر در حساب یا فرایندهای آموزشی ثبت می‌کند به کار می‌گیرد. دسترسی به اطلاعات حساب و درخواست‌های پشتیبانی باید محدود به کاربران مجاز باشد.</p>
      </div>
      <div className="trust-cards">
        <article><h2>اطلاعات آموزشی</h2><p>یادداشت‌های خصوصی آموزشی فقط در فضای حساب دانش‌آموزی نگهداری و مدیریت می‌شوند و این صفحه به آن‌ها دسترسی ندارد.</p></article>
        <article><h2>پرسش دربارهٔ داده‌ها</h2><p>برای پرسش دربارهٔ اطلاعات یا حریم خصوصی، با تیم دنا تماس بگیر.</p><a href="mailto:info@denaedu.ir" className="dena-button dena-button--outline">ارسال ایمیل</a></article>
      </div>
      <p className="content-disclaimer-block">این صفحه، راهنمای عمومی نسخهٔ نمایشی سایت است و جایگزین متن نهایی سیاست حریم خصوصی و شرایط استفاده نیست.</p>
      <p><Link href="/support" className="dena-button dena-button--primary">رفتن به پشتیبانی</Link></p>
    </section>
  </DenaPublicLayout>;
}
