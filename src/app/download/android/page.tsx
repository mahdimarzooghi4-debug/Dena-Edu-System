import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { DenaPublicLayout } from "@/components/marketing/dena-site-shell";
import { denaAndroidPreview as app } from "@/lib/dena-android-download";

export const metadata: Metadata = {
  title: "دانلود اپ اندروید دانش‌آموز دنا | نسخه آزمایشی",
  description: "دانلود مستقیم APK آزمایشی اپ دانش‌آموز دنا برای گوشی‌های اندروید. با داده نمونه و بدون پیامک یا پرداخت واقعی.",
};

export default function AndroidDownloadPage() {
  return (
    <DenaPublicLayout>
      <section className="dena-download-hero" aria-labelledby="android-download-title">
        <div className="dena-download-hero__inner">
          <div>
            <span className="eyebrow">دانلود مستقیم · فقط اندروید</span>
            <h1 id="android-download-title">اپ دانش‌آموز دنا، همراه مسیر یادگیری تو</h1>
            <p>خانه، دوره‌ها، تمرین، مسیر رشد و بخش‌های دیگر دانش‌آموزی را در گوشی اندرویدی خودت ببین. این نسخه برای آزمایش با داده‌های نمونه ساخته شده و هنوز به سرویس عملیاتیِ جدید دنا وصل نیست.</p>
            <div className="dena-download-hero__actions">
              <a className="dena-button dena-button--primary" href={app.href} download={app.name}>
                دریافت فایل APK اندروید
              </a>
              <a className="dena-button dena-button--outline" href={app.browserPreviewHref}
                 target="_blank" rel="noopener noreferrer">مشاهدهٔ نسخهٔ تحت وب</a>
            </div>
            <div className="dena-download-hero__meta" aria-label="اطلاعات نسخه">
              <span>{app.minAndroid}</span>
              <span>نسخهٔ {app.version}</span>
              <span>اینترنت لازم است</span>
            </div>
            <div className="dena-download-notice" role="note">
              این APK نسخهٔ آزمایشی با امضای دیباگ است؛ برای تست و مشاهدهٔ تجربهٔ دناست، نه نسخهٔ نهایی انتشار عمومی. ثبت‌نام واقعی، ارسال پیامک، پرداخت و صدور نمره در این نسخه انجام نمی‌شود. فایل مستقیماً از سایت دنا دریافت می‌شود.
            </div>
          </div>
          <div className="dena-download-hero__visual" aria-hidden="true">
            <div className="dena-download-hero__visual-card">
              <Image src="/dena-app-logo.png" alt="" width={128} height={73} />
              <strong>دنا | دانش‌آموز</strong>
              <span>Android · نسخهٔ آزمایشی</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dena-download-details" aria-label="راهنمای دانلود و نصب">
        <div className="dena-download-details__grid">
          <article className="dena-download-details__card">
            <h2>نحوهٔ نصب روی اندروید</h2>
            <ol>
              <li>فایل APK را از دکمهٔ بالا دریافت کن.</li>
              <li>فایل دریافت‌شده را از پوشهٔ دانلودهای گوشی باز کن.</li>
              <li>در صورت درخواست اندروید، مجوز نصب از همان منبع را بررسی و تأیید کن.</li>
              <li>اپ را باز کن. محتوای نمونه از سرویس نمایشی دنا بارگذاری می‌شود.</li>
            </ol>
          </article>
          <article className="dena-download-details__card">
            <h2>دربارهٔ نسخهٔ آزمایشی</h2>
            <p>اپ اندروید از نمایشگر امنِ صفحات دنا استفاده می‌کند. محتوای آن از نسخهٔ نمایشی موجود در سرور دنا خوانده می‌شود؛ بدون اینترنت اجرا نمی‌شود و ذخیره‌سازی آفلاین درس‌ها ندارد.</p>
            <p>نام فایل: <code dir="ltr">{app.name}</code></p>
            <p><a href={app.checksumHref}>دریافت هش SHA-256 فایل برای بررسی صحت دانلود</a></p>
            <p>اگر دانلود مستقیم از سایت برقرار نشد، <a href={app.sourceHref} rel="noopener noreferrer">لینک جایگزین GitHub</a> هم در دسترس است.</p>
            <p><Link href="/">بازگشت به صفحهٔ اصلی دنا</Link></p>
          </article>
        </div>
      </section>
    </DenaPublicLayout>
  );
}
