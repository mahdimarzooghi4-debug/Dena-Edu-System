import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پیش‌نمایش پنل مؤسسه | دنا",
  robots: { index: false, follow: false },
};

const sections = {
  dashboard: "داشبورد",
  courses: "دوره‌ها",
  sessions: "جلسات و محتوا",
  students: "دانش‌آموزان",
  instructors: "مدرس‌ها",
  providers: "ارائه‌دهندگان و مدرس‌ها",
  collaborations: "درخواست همکاری ارائه‌دهنده",
  educators: "همکاران مستقل",
  "question-bank": "بانک سؤال",
  exams: "آزمون‌ها و ارزیابی‌ها",
  assessments: "آزمون‌ها و ارزیابی‌ها",
  learning: "مسیر رشد دانش‌آموزان",
  "academic-supporters": "پشتیبانان تحصیلی",
  notifications: "اعلان‌ها",
  services: "خدمات جانبی",
  "service-orders": "تیم خدمات",
  support: "پشتیبانی آنلاین",
  profile: "پروفایل مؤسسه",
} as const;

type DemoSection = keyof typeof sections;

const stats = [
  { label: "دوره‌های فعال", value: "۱۲", symbol: "▤", color: "bg-[#eeeaff] text-[#5b4ce2]" },
  { label: "دانش‌آموزان فعال", value: "۳۴۸", symbol: "◉", color: "bg-[#e8f5ef] text-[#24845a]" },
  { label: "آزمون‌های اخیر", value: "۲۷", symbol: "♙", color: "bg-[#fff3df] text-[#b7791f]" },
  { label: "موارد نیازمند توجه", value: "۵", symbol: "!", color: "bg-[#fff0f0] text-[#c04c4c]" },
];

const attentionItems = [
  "بانک سؤال ریاضی دهم — ۳ سؤال در حال تکمیل",
  "آزمون فیزیک جلسهٔ ۵ — نیاز به بررسی",
  "دورهٔ شیمی — محتوای جلسهٔ ۸ بارگذاری نشده",
];

const activities = [
  ["۲ ساعت پیش", "دانش‌آموز محمد علوی آزمون ریاضی را تکمیل کرد"],
  ["۵ ساعت پیش", "جلسهٔ ۹ دورهٔ فیزیک اضافه شد"],
  ["۱ روز پیش", "بانک سؤال دورهٔ زیست نیازمند تکمیل است"],
  ["۲ روز پیش", "درخواست پشتیبانی جدید ثبت شد"],
];

function isDemoSection(value: string | undefined): value is DemoSection {
  return Boolean(value && value in sections);
}

export default async function InstituteDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: requestedSection } = await searchParams;
  const section: DemoSection = isDemoSection(requestedSection) ? requestedSection : "dashboard";

  if (section !== "dashboard") {
    return (
      <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc] p-5 md:p-8">
        <header className="mb-6 rounded-xl border border-[#e5e1ed] bg-white p-5">
          <p className="text-xs font-bold text-[#5b4ce2]">پیش‌نمایش پنل مؤسسه</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#1e1a33]">{sections[section]}</h1>
        </header>
        <section className="rounded-xl border border-[#e5e1ed] bg-white p-8 text-center">
          <p className="text-sm leading-7 text-[#7e7a94]">پیش‌نمایش این بخش در نوبت بعدی بررسی پنل آماده می‌شود.</p>
          <Link href="/institute/demo" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#5b4ce2] px-5 text-sm font-bold text-white">بازگشت به داشبورد نمونه</Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc] text-[#1e1a33]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <h1 className="text-xl font-extrabold">داشبورد</h1>
        <div className="flex items-center gap-3">
          <Link href="/institute/demo?section=notifications" aria-label="اعلان‌ها" className="grid size-10 place-items-center rounded-lg bg-[#f8f7fc] text-[#5b4ce2]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </Link>
          <div role="search" className="hidden w-[280px] items-center gap-2 rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 sm:flex">
            <span aria-hidden="true" className="text-[#7e7a94]">⌕</span>
            <span className="text-sm text-[#7e7a94]">جستجو...</span>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8d0ff] bg-[#f0edff] px-5 py-3 text-sm">
          <span className="font-extrabold text-[#4d3bd0]">نسخهٔ نمایشی پنل مؤسسه</span>
          <span className="text-[#655d83]">داده‌ها نمونه‌اند؛ اطلاعاتی ثبت یا ذخیره نمی‌شود.</span>
        </div>

        <section aria-label="آمار نمونهٔ مؤسسه" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="flex min-h-[98px] items-center gap-4 rounded-xl border border-[#e5e1ed] bg-white p-5">
              <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-lg text-lg font-black ${stat.color}`}>{stat.symbol}</span>
              <div>
                <h2 className="text-[13px] leading-6 text-[#7e7a94]">{stat.label} <span className="text-[10px]">(نمونه)</span></h2>
                <p className="text-[22px] font-extrabold leading-8">{stat.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-md bg-[#fff3df] px-2 py-1 text-xs font-bold text-[#b7791f]">۵ مورد</span>
              <h2 className="text-base font-extrabold">موارد نیازمند توجه</h2>
            </div>
            <ul className="space-y-3">
              {attentionItems.map((item) => (
                <li key={item} className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-3 text-sm">
                  <span className="rounded bg-[#fff3df] px-2 py-1 text-[11px] font-bold text-[#b7791f]">بررسی</span>
                  <span className="text-right">{item} <small className="text-[#918aa4]">(نمونه)</small></span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <h2 className="mb-4 text-base font-extrabold">آخرین فعالیت‌ها</h2>
            <ul className="divide-y divide-[#eeeaf4]">
              {activities.map(([time, activity]) => (
                <li key={activity} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="shrink-0 text-xs text-[#918aa4]">{time}</span>
                  <span className="text-right">{activity} <small className="text-[#918aa4]">(نمونه)</small></span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section aria-labelledby="institute-demo-quick-actions" className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
          <h2 id="institute-demo-quick-actions" className="mb-4 text-[15px] font-extrabold">دسترسی سریع عملیاتی</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/institute/demo?section=students" className="inline-flex min-h-10 items-center rounded-lg border border-[#c9c1ff] px-4 text-sm font-bold text-[#5b4ce2] hover:bg-[#f7f5ff]">مشاهده دانش‌آموزان</Link>
            <Link href="/institute/demo?section=question-bank" className="inline-flex min-h-10 items-center rounded-lg border border-[#c9c1ff] px-4 text-sm font-bold text-[#5b4ce2] hover:bg-[#f7f5ff]">مدیریت بانک سؤال</Link>
            <Link href="/institute/demo?section=courses" className="inline-flex min-h-10 items-center rounded-lg bg-[#5b4ce2] px-4 text-sm font-bold text-white hover:bg-[#4b3ad2]">ایجاد دورهٔ جدید</Link>
          </div>
        </section>

        <p className="text-center text-xs text-[#8a849b]">برای ثبت درخواست واقعی همکاری، به <Link href="/institutes/request" className="font-bold text-[#5b4ce2] underline">صفحهٔ مؤسسات</Link> برگردید.</p>
      </div>
    </main>
  );
}
