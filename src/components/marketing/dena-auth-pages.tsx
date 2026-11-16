import Image from "next/image";
import Link from "next/link";
import { MobileSignIn } from "../auth/mobile-sign-in";
import { DenaPublicLayout } from "./dena-site-shell";
import "./dena-auth-pages.css";

type AuthMode = "login" | "signup" | "recovery";

const pages: Record<AuthMode, {
  eyebrow: string;
  title: string;
  description: string;
  fields: Array<{ label: string; placeholder: string; type?: string; phone?: boolean; required?: boolean }>;
  action: string;
  secondary?: { label: string; href: string };
  links?: Array<{ label: string; href: string }>;
  note: string;
  disclaimer: string;
}> = {
  login: {
    eyebrow: "ورود دانش‌آموز",
    title: "به مسیر یادگیری‌ات در دنا برگرد",
    description: "شماره موبایل را وارد کن تا کد تأیید ورود به حساب دانش‌آموزی درخواست شود.",
    fields: [
      { label: "شماره همراه", placeholder: "شماره همراه ثبت‌شده را وارد کنید", type: "tel", phone: true },
      { label: "رمز عبور", placeholder: "رمز عبور را وارد کنید", type: "password" },
    ],
    action: "ورود به حساب",
    links: [{ label: "رمز عبورت را فراموش کرده‌ای؟", href: "/account/recovery" }],
    secondary: { label: "حساب دانش‌آموزی نداری؟ ثبت‌نام کن", href: "/signup" },
    note: "برای همکاری مؤسسه آموزشی، از فرم درخواست همکاری مؤسسات استفاده کنید.",
    disclaimer: "پیش‌نمایش رابط؛ شیوه نهایی ورود و ثبت‌نام و الزامات حساب دانش‌آموزی هنوز قطعی نشده است.",
  },
  signup: {
    eyebrow: "ثبت‌نام دانش‌آموز",
    title: "حساب دانش‌آموزی دنا را بساز",
    description: "اطلاعات اولیه را وارد کن؛ دوره‌ها و مسیر رشد در فضای دانش‌آموزی جدا از این سایت دنبال می‌شوند.",
    fields: [
      { label: "نام و نام خانوادگی", placeholder: "نام دانش‌آموز" },
      { label: "شماره همراه", placeholder: "شماره همراه برای حساب دانش‌آموزی", type: "tel", phone: true },
      { label: "پایه تحصیلی (اختیاری)", placeholder: "پایه تحصیلی خود را بنویسید", required: false },
      { label: "رمز عبور", placeholder: "رمز عبور را وارد کنید", type: "password" },
      { label: "تکرار رمز عبور", placeholder: "رمز عبور را دوباره وارد کنید", type: "password" },
    ],
    action: "ایجاد حساب دانش‌آموزی",
    secondary: { label: "قبلاً حساب ساخته‌ای؟ وارد شو", href: "/login" },
    note: "ثبت‌نام دانش‌آموز با درخواست همکاری مؤسسات آموزشی متفاوت است.",
    disclaimer: "پیش‌نمایش رابط؛ شیوه نهایی ورود و ثبت‌نام و الزامات حساب دانش‌آموزی هنوز قطعی نشده است.",
  },
  recovery: {
    eyebrow: "بازیابی حساب دانش‌آموزی",
    title: "بازگشت به مسیر یادگیری در دنا",
    description: "شماره همراه ثبت‌شده را وارد کن تا مسیر بازیابی دسترسی آغاز شود. روش تأیید هویت بعداً نهایی می‌شود.",
    fields: [{ label: "شماره همراه", placeholder: "شماره همراه ثبت‌شده را وارد کنید", type: "tel", phone: true }],
    action: "ادامه بازیابی",
    secondary: { label: "بازگشت به صفحه ورود", href: "/login" },
    note: "برای همکاری مؤسسات، فرم درخواست همکاری جداگانه است.",
    disclaimer: "پیش‌نمایش طراحی؛ سازوکار نهایی بازیابی و تأیید هویت هنوز قطعی نشده است.",
  },
};

function NetworkPromise({ mode }: { mode: AuthMode }) {
  const signup = mode === "signup";
  return <section className={`dena-auth-preview__visual${signup ? " dena-auth-preview__visual--signup" : ""}`} aria-label="اکوسیستم آموزشی دنا">
    <span>{signup ? "دانش‌آموزان نوآفرین ایران" : "اکوسیستم آموزشی دنا"}</span>
    <h2>{signup ? "شروع یک مسیر برای رشد تحصیلی" : mode === "login" ? "یادگیری‌ات را از همین‌جا ادامه بده" : "مسیر یادگیری ادامه دارد"}</h2>
    <p>{signup ? "در دنا، دانش‌آموز فقط به یک دوره متصل نمی‌شود؛ مسیر رشد او همراهی و پایش می‌شود." : "دوره‌های ضبط‌شده، تمرین، آزمون و مشاهده مسیر رشد؛ همه در تجربه یکپارچه دنا."}</p>
    <Image src="/figma/auth/abstract-network.webp" alt="" width={580} height={480} priority />
  </section>;
}

export function DenaAuthPage({ mode }: { mode: AuthMode }) {
  const page = pages[mode];
  const smsEnabled = process.env.DENA_SMS_ENABLED === "1" &&
    Boolean(process.env.DENA_SMS_GATEWAY_URL && process.env.DENA_SMS_GATEWAY_TOKEN &&
      process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
  return <DenaPublicLayout>
    <div className={`dena-auth-preview dena-auth-preview--${mode}`}>
      <NetworkPromise mode={mode} />
      <section className="dena-auth-preview__card" aria-labelledby="dena-auth-title">
        <span className="dena-auth-preview__eyebrow">{page.eyebrow}</span>
        <h1 id="dena-auth-title">{mode === "login" ? "ورود یا ثبت‌نام" : page.title}</h1>
        <p className="dena-auth-preview__description">{page.description}</p>
        <div className="dena-auth-preview__divider" />
        {mode === "login" ? <>
          <MobileSignIn enabled={smsEnabled} />
        </> : <div className="dena-auth-preview__fields">
          {page.fields.map((field) => <div className="dena-auth-preview__field" key={field.label}>
            <label>{field.label}{field.required !== false && <> <span>*</span></>}</label>
            <input type={field.type ?? "text"} placeholder={field.placeholder} readOnly tabIndex={-1} dir={field.phone ? "ltr" : "rtl"} aria-label={field.label} />
          </div>)}
        </div>}
        {page.links?.map((link) => <Link className="dena-auth-preview__inline-link" href={link.href} key={link.href}>{link.label}</Link>)}
        {mode === "signup" ? <Link className="dena-auth-preview__submit" href="/login?flow=signup">{page.action}</Link> : mode === "recovery" ? <Link className="dena-auth-preview__submit" href="/account/recovery/continue">{page.action}</Link> : null}
        {page.secondary && <Link className="dena-auth-preview__secondary" href={page.secondary.href}>{page.secondary.label}</Link>}
        {mode !== "login" && <>
          <div className="dena-auth-preview__divider dena-auth-preview__divider--lower" />
          <p className="dena-auth-preview__note">{page.note}</p>
          <p className="dena-auth-preview__disclaimer">{page.disclaimer}</p>
        </>}
      </section>
    </div>
  </DenaPublicLayout>;
}
