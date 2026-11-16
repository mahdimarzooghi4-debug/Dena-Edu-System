import Image from "next/image";
import Link from "next/link";
import "./dena-homepage.css";
import { DenaSiteNavigation } from "./dena-site-navigation";

/** Shared public header action: Android download icon and visible label. */
export function DenaAndroidHeaderLink() {
  return (
    <Link
      className="dena-header__app-icon"
      href="/download/android"
      aria-label="دانلود اپ اندروید دنا"
      title="دانلود اپ اندروید دنا"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="2.5" width="14" height="19" rx="2.8" />
        <path d="M10 8.5v6m0 0-2.3-2.3M10 14.5l2.3-2.3" />
        <path d="M14.5 16h-1m-2.5 2.5h2" />
      </svg>
      <span className="dena-header__app-label">دانلود اپلیکیشن</span>
    </Link>
  );
}

/** Canonical public-site header. Android download stays visible alongside login/signup. */
export function DenaSiteHeader() {
  return (
    <header className="dena-header">
      <div className="dena-header__actions">
        <Link className="dena-button dena-button--outline" href="/login">ورود</Link>
        <Link className="dena-button dena-button--primary dena-header__signup" href="/signup" data-testid="dena-header-signup" aria-label="ثبت‌نام در دنا">ثبت‌نام</Link>
        <DenaAndroidHeaderLink />
      </div>
      <div className="dena-header__right">
        <DenaSiteNavigation />
        <Link className="dena-brand" href="/" aria-label="دنا، صفحهٔ اصلی">
          <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        </Link>
      </div>
    </header>
  );
}

/** One canonical footer, shared by the homepage and every public-site subpage. */
export function DenaSiteFooter() {
  return (
    <footer className="dena-footer">
        <div className="dena-footer__main">
          <div className="dena-footer__brand"><Link className="dena-brand dena-brand--footer" href="/" aria-label="دنا، صفحهٔ اصلی"><Image src="/dena-app-logo.png" alt="دنا" width={119} height={72} /></Link><p>دنا، بستر آموزش، یادگیری و رشد دانش‌آموزان نوآفرین ایران.</p></div>
          <div><h3>دنا</h3><Link href="/courses">دوره‌ها</Link><Link href="/growth">مسیر رشد</Link><Link href="/elite-club">باشگاه نخبگان</Link><Link href="/assessments">آزمون‌ها</Link><Link href="/about">درباره دنا</Link></div>
          <div><h3>همکاری با دنا</h3><Link href="/institutes/request">ثبت‌نام مؤسسات</Link><Link href="/institutes/collaboration">سازمان‌ها و حامیان</Link></div>
          <div><h3>راهنما</h3><Link href="/support">پشتیبانی فنی</Link><Link href="/privacy">حریم خصوصی</Link></div>
          <div className="dena-footer__contact">
            <h3>تماس با دنا</h3>
            <a href="tel:+982166485374"><Image src="/figma/dena-home/footer-phone.svg" alt="" width={16} height={16} /><span>تلفن:</span><span>۰۲۱-۶۶۴۸۵۳۷۴</span></a>
            <a href="mailto:info@denaes.ir"><Image src="/figma/dena-home/footer-mail.svg" alt="" width={16} height={16} /><span>ایمیل:</span><span>info@denaes.ir</span></a>
            <p><Image src="/figma/dena-home/footer-map-pin.svg" alt="" width={16} height={16} /><span>آدرس:</span><span>خیابان انقلاب، خیابان رازی، کوچه شهبازیان، پلاک ۲۲</span></p>
          </div>
        </div>
        <div className="dena-footer__legal">حقوق پلتفرم و هویت دنا محفوظ است. حقوق محتوای آموزشی هر دوره متعلق به مؤسسه یا ارائه‌دهندهٔ آن است.</div>
      </footer>
  );
}

export function DenaRoleIcon({ kind }: { kind: string }) {
  const common = { width: 25, height: 25, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "student") return <svg {...common}><path d="m12 3 2.2 5.1 5.5.5-4.2 3.6 1.3 5.4-4.8-2.9-4.8 2.9 1.3-5.4-4.2-3.6 5.5-.5L12 3Z"/><path d="M5 20h14"/></svg>;
  if (kind === "institute") return <svg {...common}><path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18"/><path d="M10 7.5h4"/></svg>;
  if (kind === "provider") return <svg {...common}><circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m10.8 7.3-3.6 8.4m5.9-8.4 3.6 8.4M8.5 18h7"/></svg>;
  if (kind === "organization") return <svg {...common}><path d="M4 20V7l8-4 8 4v13M2 20h20"/><path d="M8 9v2m4-2v2m4-2v2M8 14v2m4-2v2m4-2v2"/></svg>;
  return <svg {...common}><path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/><path d="M8.5 12h7"/></svg>;
}

export function DenaPublicLayout({ children }: { children: React.ReactNode }) {
  return <><DenaSiteHeader /><main id="main-content" className="dena-subpage">{children}</main><DenaSiteFooter /></>;
}
