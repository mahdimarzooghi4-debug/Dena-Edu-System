import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { DemoPracticeCard } from "@/components/student-demo/practice-card";
import { StudentDemoServiceCenter } from "@/components/student-demo/service-center";
import { StudentDemoSupportNotifications } from "@/components/student-demo/support-notifications";
import { EliteClubDemo } from "@/components/student-demo/elite-club";
import { StudentFlowDemo } from "@/components/student-demo/student-flows";

export const metadata: Metadata = {
  title: "اپ دانش‌آموز دنا",
  description: "پیش‌نمایش اپ دانش‌آموز دنا بر اساس طراحی تأییدشدهٔ Figma",
  robots: { index: false, follow: false },
};

type StudentSection =
  | "home" | "aiTutor" | "courses" | "assessments" | "growth"
  | "elite" | "account" | "services" | "notifications";

type DemoCourse = {
  id: string;
  title: string;
  provider: string;
  done: number;
  total: number;
  currentSession?: number;
  progressOverride?: number;
  lastActivity?: string;
  lessons: string[];
};

const demoCourses: DemoCourse[] = [
  {
    id: "math-7",
    title: "ریاضی دهم",
    provider: "مؤسسه آموزشی البرز",
    done: 18,
    total: 24,
    currentSession: 8,
    progressOverride: 75,
    lastActivity: "امروز",
    lessons: ["دامنه تابع", "مفهوم تابع", "تابع و نمودار", "انواع نمودار"],
  },
  {
    id: "science-7",
    title: "فیزیک دهم",
    provider: "آموزشگاه نور دانش",
    done: 12,
    total: 20,
    currentSession: 5,
    progressOverride: 60,
    lastActivity: "دیروز",
    lessons: ["نیرو و حرکت", "نور", "کار و انرژی", "گرما"],
  },
  { id: "chemistry-10", title: "شیمی دهم", provider: "مرکز علمی پژوهان", done: 8, total: 18, currentSession: 2, progressOverride: 45, lastActivity: "۳ روز پیش", lessons: ["ساختار اتم", "جدول تناوبی", "پیوند شیمیایی"] },
  { id: "science-9", title: "علوم نهم", provider: "دبیرستان فرزانگان", done: 16, total: 16, currentSession: 16, progressOverride: 100, lastActivity: "۱ هفته پیش", lessons: ["علوم پایه", "مرور فصل‌ها"] },
];

const teamRoles = [
  { id: "teacher", title: "مدرس", name: "استاد احمدی", detail: "آموزش و محتوای دوره" },
  { id: "supporter", title: "پشتیبان تحصیلی", name: "سارا کریمی", detail: "رفع اشکال و پیگیری یادگیری" },
  { id: "counselor", title: "مشاور", name: "مهدی رضایی", detail: "راهنمایی در چارچوب خدمات مؤسسه" },
] as const;

const pages: Record<string, { title: string; active: StudentSection }> = {
  home: { title: "خانه من", active: "home" },
  courses: { title: "دوره‌های من", active: "courses" },
  "ai-tutor": { title: "معلم هوشمند", active: "aiTutor" },
  assessments: { title: "تمرین‌ها و آزمون‌ها", active: "assessments" },
  growth: { title: "مسیر رشد", active: "growth" },
  "elite-club": { title: "باشگاه نخبگان", active: "elite" },
  profile: { title: "پروفایل کاربری", active: "account" },
  services: { title: "مرکز خدمات", active: "services" },
  support: { title: "پشتیبانی آنلاین دنا", active: "services" },
  notifications: { title: "اعلان‌ها", active: "notifications" },
};



function Home() {
  const courses = [
    { id: "math-7", title: "ریاضی دهم", institute: "مؤسسه آموزشی البرز", progress: 33, lesson: "جلسه ۸ از ۲۴", topic: "تابع و نمودار", last: "امروز", tone: "from-indigo-500 to-violet-600" },
    { id: "science-7", title: "فیزیک دهم", institute: "آموزشگاه نور دانش", progress: 27, lesson: "جلسه ۵ از ۱۸", topic: "فیزیک ۱", last: "دیروز", tone: "from-sky-500 to-cyan-500" },
    { id: "chemistry-10", title: "شیمی دهم", institute: "مرکز علمی پژوهان", progress: 12, lesson: "جلسه ۲ از ۱۶", topic: "ساختار اتم", last: "۳ روز پیش", tone: "from-emerald-500 to-teal-500" },
  ];
  const assessments = [
    { title: "آزمون فصل سوم ریاضی", course: "ریاضی دهم", status: "آماده انجام", color: "bg-dena-lavender text-dena-brand", href: "/student-demo/assessments/math-7-practice", icon: "✦" },
    { title: "تمرین فیزیک · نور", course: "فیزیک دهم", status: "در انتظار", color: "bg-amber-50 text-amber-800", href: "/student-demo/assessments?filter=pending", icon: "◉" },
    { title: "آزمون فصل دوم شیمی", course: "شیمی دهم", status: "انجام‌شده", color: "bg-emerald-50 text-emerald-700", href: "/student-demo/assessments?filter=completed", icon: "✓" },
  ];
  return (
    <div dir="rtl" className="space-y-7 text-right md:space-y-8">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] px-5 py-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:px-8 md:py-8">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-50">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              فضای یادگیری تو در دنا
            </span>
            <h2 className="mt-4 text-[25px] font-extrabold leading-relaxed md:text-[32px]">سلام محمد 👋</h2>
            <p className="mt-1 max-w-xl text-sm leading-7 text-indigo-100 md:text-base">یک قدم کوچک امروز، تو را به هدف‌های بزرگت نزدیک‌تر می‌کند.</p>
            <div className="mt-5 flex flex-wrap justify-start gap-3">
              <Link href="/student-demo/courses/math-7/lessons/3" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-extrabold text-[#3729a8] shadow-sm transition hover:bg-indigo-50">ادامهٔ یادگیری</Link>
              <Link href="/student-demo/growth" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15">مشاهدهٔ مسیر رشد</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 md:min-w-[390px] md:gap-3" dir="rtl">
            {[["۰۳", "دورهٔ فعال"], ["۰۱", "فعالیت امروز"], ["۶۸٪", "پیشرفت هفته"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-2 py-4 text-center backdrop-blur-sm md:px-4 md:py-5">
                <p className="text-xl font-extrabold md:text-2xl">{value}</p>
                <p className="mt-1 text-[10px] leading-5 text-indigo-100 md:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="relative overflow-hidden rounded-[24px] border-0 bg-[#f0edff] p-5 md:p-6 lg:col-span-3">
          <div aria-hidden="true" className="absolute -left-8 -top-8 size-32 rounded-full bg-white/70 blur-xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="text-right">
              <div className="mb-3 inline-grid size-11 place-items-center rounded-2xl bg-white text-xl text-dena-brand shadow-sm" aria-hidden="true">✧</div>
              <h3 className="text-lg font-extrabold text-dena-deep">معلم هوشمند</h3>
              <p className="mt-2 max-w-lg text-sm leading-7 text-dena-muted">همراهی برای فهم بهتر درس‌ها و پیدا کردن قدم بعدی در مسیر یادگیری.</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-dena-brand">در حال آماده‌سازی</span>
          </div>
          <div className="relative mt-4 flex flex-col justify-between gap-3 border-t border-violet-200/70 pt-4 sm:flex-row sm:items-center">
            <p className="text-xs leading-6 text-dena-muted">گفت‌وگو پس از آماده‌سازی و ارزیابی سرویس فعال می‌شود.</p>
            <Link href="/student-demo/ai-tutor" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-dena-brand px-4 text-xs font-bold text-white transition hover:bg-dena-deep">آشنایی با معلم هوشمند</Link>
          </div>
        </Card>

        <Card className="rounded-[24px] border-dena-border bg-white p-5 md:p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-dena-muted">پیشنهاد برای ادامه</p>
              <h3 className="mt-1 font-extrabold text-dena-deep">آزمون فصل سوم ریاضی</h3>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800">امروز</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-dena-muted">آمادگی‌ات را با یک آزمون کوتاه بسنج و نتیجه را در مسیر رشدت ببین.</p>
          <Link href="/student-demo/assessments/math-7-practice" className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-dena-brand/20 bg-dena-lavender px-4 text-sm font-bold text-dena-brand transition hover:border-dena-brand">شروع آزمون</Link>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-dena-muted">یادگیری را ادامه بده</p>
            <h3 className="mt-1 text-xl font-extrabold text-dena-deep">دوره‌های من</h3>
          </div>
          <Link href="/student-demo/courses" className="text-xs font-bold text-dena-brand hover:underline">همهٔ دوره‌ها ←</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.map(course => <Card key={course.id} className="overflow-hidden rounded-[22px] border-dena-border p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`relative flex h-28 items-center justify-between overflow-hidden bg-gradient-to-l ${course.tone} px-5 text-white`}>
              <div aria-hidden="true" className="absolute -left-5 -top-10 size-36 rounded-full border-[22px] border-white/10" />
              <div className="relative grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm"><CourseGlyph courseId={course.id} /></div>
              <span className="relative rounded-full bg-black/10 px-3 py-1.5 text-[11px] font-bold">در حال یادگیری</span>
            </div>
            <div className="space-y-4 p-4 text-right">
              <div>
                <h4 className="text-base font-extrabold text-dena-deep">{course.title}</h4>
                <p className="mt-1 text-xs text-dena-muted">{course.institute}</p>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-extrabold text-dena-brand">{course.progress.toLocaleString("fa-IR")}٪</span>
                <span className="text-dena-muted">{course.lesson}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint transition-all" style={{ width: `${course.progress}%` }} /></div>
              <div className="flex items-center justify-between gap-2 border-t border-dena-border pt-3 text-xs">
                <Link href={`/student-demo/courses/${course.id}`} className="font-bold text-dena-brand hover:underline">جزئیات دوره</Link>
                <span className="truncate text-dena-muted">{course.topic} · {course.last}</span>
              </div>
            </div>
          </Card>)}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-end justify-between gap-3">
            <div className="text-right"><p className="text-xs font-semibold text-dena-muted">برنامهٔ درسی</p><h3 className="mt-1 text-xl font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h3></div>
            <Link href="/student-demo/assessments" className="text-xs font-bold text-dena-brand hover:underline">همهٔ فعالیت‌ها ←</Link>
          </div>
          <div className="space-y-2.5">
            {assessments.map(item => <Link key={item.title} href={item.href} className="group flex items-center justify-between gap-3 rounded-2xl border border-dena-border bg-white p-4 transition hover:border-dena-brand/40 hover:shadow-sm">
              <span className="flex min-w-0 items-center gap-3 text-right">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-dena-bg text-sm font-bold text-dena-brand" aria-hidden="true">{item.icon}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-dena-deep">{item.title}</span><span className="mt-1 block text-xs text-dena-muted">{item.course}</span></span>
              </span>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${item.color}`}>{item.status}</span>
            </Link>)}
          </div>
        </section>

        <Card className="space-y-4 rounded-[24px] border-dena-border p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-right"><p className="text-xs font-semibold text-dena-muted">این هفته</p><h3 className="mt-1 font-extrabold text-dena-deep">مسیر رشد من</h3></div>
            <Link href="/student-demo/growth" className="text-xs font-bold text-dena-brand">جزئیات ←</Link>
          </div>
          <p className="text-sm leading-7 text-dena-muted">۴ جلسه آموزشی تکمیل شد و ۲ تمرین انجام شد.</p>
          <div className="flex items-center gap-4">
            <div className="grid size-[76px] shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#27c9a4 0 68%, #eeeaff 68% 100%)" }}>
              <div className="grid size-[58px] place-items-center rounded-full bg-white text-sm font-extrabold text-dena-deep">۶۸٪</div>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="font-bold text-dena-deep">ریتم خوبی داری!</p>
              <p className="mt-1 text-xs leading-6 text-dena-muted">با ادامهٔ همین روند، به هدف هفتگی‌ات نزدیک می‌شوی.</p>
            </div>
          </div>
          <Link href="/student-demo/growth" className="flex min-h-10 items-center justify-center rounded-xl bg-dena-lavender text-xs font-bold text-dena-brand">مشاهدهٔ گزارش هفتگی</Link>
        </Card>
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 rounded-[22px] border-dena-border bg-white p-5 sm:flex-row sm:items-center md:p-6">
        <div className="flex items-center gap-3 text-right">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-lg text-amber-600" aria-hidden="true">☆</div>
          <div><h3 className="font-extrabold text-dena-deep">باشگاه نخبگان</h3><p className="mt-1 text-sm text-dena-muted">فرصت‌های تازه برای رشد استعدادهایت.</p></div>
        </div>
        <Link href="/student-demo/elite-club" className="shrink-0 text-xs font-bold text-dena-brand">آشنایی با باشگاه ←</Link>
      </Card>
      <p className="text-center text-[11px] text-dena-muted">این صفحه با داده‌های نمونه برای نمایش امکانات پنل ساخته شده است.</p>
    </div>
  );
}

function CourseGlyph({ courseId }: { courseId: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {courseId === "math-7" ? <><path d="M6 6h12M9 6l-4 12h14M8 18h10" /></> :
        courseId === "science-7" ? <><ellipse cx="12" cy="12" rx="9" ry="3.7" /><ellipse cx="12" cy="12" rx="9" ry="3.7" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.7" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></> :
        courseId === "chemistry-10" ? <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></> :
        <><path d="M20 4C11 4 5 8 5 15a5 5 0 0 0 5 5c7 0 10-8 10-16Z" /><path d="M7 18c3-4 6-7 11-10" /></>}
    </svg>
  );
}

function CourseList({ filter = "all" }: { filter?: string }) {
  const catalog = [
    { ...demoCourses[0], title: "ریاضی دهم", provider: "مؤسسه آموزشی البرز", teacher: "استاد احمدی", done: 18, total: 24, currentSession: 8, progressOverride: 75, lastActivity: "امروز", topic: "تابع و نمودار", tone: "from-indigo-500 to-violet-600" },
    { ...demoCourses[1], title: "فیزیک دهم", provider: "آموزشگاه نور دانش", teacher: "استاد محمدی", done: 12, total: 20, currentSession: 5, progressOverride: 60, lastActivity: "دیروز", topic: "نیرو و حرکت", tone: "from-sky-500 to-cyan-500" },
    { id: "chemistry-10", title: "شیمی دهم", provider: "مرکز علمی پژوهان", teacher: "استاد رضایی", done: 8, total: 18, currentSession: 2, progressOverride: 45, lastActivity: "۳ روز پیش", lessons: ["ساختار اتم", "جدول تناوبی", "پیوند شیمیایی"], topic: "ساختار اتم", tone: "from-emerald-500 to-teal-500" },
    { id: "science-9", title: "علوم نهم", provider: "دبیرستان فرزانگان", teacher: "استاد کریمی", done: 16, total: 16, currentSession: 16, progressOverride: 100, lastActivity: "۱ هفته پیش", lessons: ["علوم پایه", "مرور فصل‌ها"], topic: "تکمیل دوره", tone: "from-amber-500 to-orange-500" },
  ];
  const visibleCatalog = catalog.filter(course => filter === "all" || (filter === "completed" ? course.done === course.total : course.done < course.total));
  const completedCount = catalog.filter(course => course.done === course.total).length;
  const activeCount = catalog.length - completedCount;
  const averageProgress = Math.round(catalog.reduce((sum, course) => sum + (course.progressOverride ?? 0), 0) / catalog.length);

  return (
    <div dir="rtl" className="space-y-6 text-right md:space-y-8">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] px-5 py-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:px-8 md:py-8">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-50">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              مسیر یادگیری تو
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-relaxed md:text-[32px]">دوره‌های من</h2>
            <p className="mt-1 text-sm leading-7 text-indigo-100 md:text-base">پیشرفتت را دنبال کن و از همان‌جایی که مانده‌ای، یادگیری را ادامه بده.</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:min-w-[390px] md:gap-3">
            {[[catalog.length.toLocaleString("fa-IR"), "همهٔ دوره‌ها"], [activeCount.toLocaleString("fa-IR"), "در حال یادگیری"], [averageProgress.toLocaleString("fa-IR") + "٪", "میانگین پیشرفت"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-2 py-4 text-center backdrop-blur-sm md:px-4">
                <p className="text-xl font-extrabold md:text-2xl">{value}</p>
                <p className="mt-1 text-[10px] leading-5 text-indigo-100 md:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-dena-muted">دوره‌هایی که در آن‌ها ثبت‌نام کرده‌ای</p>
        <nav aria-label="فیلتر دوره‌ها" className="flex w-fit flex-wrap justify-start gap-1 rounded-2xl bg-dena-bg p-1.5">
          {[["all", "همه"], ["learning", "در حال یادگیری"], ["completed", "تکمیل‌شده"]].map(([key, label]) => (
            <Link key={key} href={key === "all" ? "/student-demo/courses" : `/student-demo/courses?filter=${key}`} aria-current={filter === key ? "page" : undefined}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${filter === key ? "bg-white text-dena-brand shadow-sm" : "text-dena-muted hover:text-dena-brand"}`}>
              {label}
              {key === "completed" && <span className="mr-1.5 text-[10px] opacity-75">{completedCount.toLocaleString("fa-IR")}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleCatalog.map(course => {
          const progress = course.progressOverride ?? Math.round(course.done / course.total * 100);
          const completed = progress === 100;
          return (
            <Card key={course.id} className="group overflow-hidden rounded-[24px] border-dena-border p-0 transition duration-200 hover:-translate-y-0.5 hover:border-dena-brand/25 hover:shadow-lg">
              <div className={`relative flex min-h-32 items-center justify-between overflow-hidden bg-gradient-to-l ${course.tone} px-5 py-5 text-white md:px-6`}>
                <div aria-hidden="true" className="absolute -left-6 -top-12 size-36 rounded-full border-[22px] border-white/10" />
                <div className="relative text-right">
                  <span className="inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">{completed ? "تکمیل‌شده" : "در حال یادگیری"}</span>
                  <h3 className="mt-3 text-xl font-extrabold">{course.title}</h3>
                  <p className="mt-1 text-xs text-white/85">{course.provider}</p>
                </div>
                <div className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-sm backdrop-blur-sm">
                  <CourseGlyph courseId={course.id} />
                </div>
              </div>
              <div className="space-y-4 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-dena-ink">{course.topic} · جلسه {(course.currentSession ?? course.done).toLocaleString("fa-IR")} از {course.total.toLocaleString("fa-IR")}</p>
                  <p className="text-xs text-dena-muted">مدرس: {course.teacher}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-extrabold text-dena-brand">{progress.toLocaleString("fa-IR")}٪ پیشرفت</span>
                    
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-dena-lavender" role="progressbar" aria-label={`پیشرفت ${course.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <div className="h-full rounded-full bg-dena-mint transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-4">
                  <span className="text-xs text-dena-muted">آخرین فعالیت: {course.lastActivity ?? "امروز"}</span>
                  <Link href={`/student-demo/courses/${course.id}`} className={buttonClassName(completed ? "outline" : undefined) + " min-h-10 px-4"}>
                    {completed ? "مشاهدهٔ دوره" : "ادامه یادگیری"}
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {visibleCatalog.length === 0 && <Card className="rounded-[24px] border-dena-border p-8 text-center text-sm text-dena-muted">در این وضعیت دوره‌ای برای نمایش نیست.</Card>}
    </div>
  );
}
function CourseDetail({ course }: { course: DemoCourse }) {
  const progress = course.id === "math-7" ? 29 : (course.progressOverride ?? Math.round(course.done / course.total * 100));
  const currentSession = course.currentSession ?? course.done;
  const currentLesson = course.id === "math-7" ? "تابع و نمودار" : course.lessons[Math.max(0, course.lessons.length - 1)];
  const lessonPath = course.id === "math-7" ? 3 : Math.max(1, course.lessons.length);
  return (
    <div className="space-y-4">
      <Card className="space-y-4 rounded-[22px] p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-right">
            <p className="text-xs font-bold text-dena-brand">{course.provider}</p>
            <h2 className="mt-2 text-xl font-extrabold text-dena-deep">{course.title}</h2>
            <p className="mt-1 text-sm text-dena-muted">{currentLesson}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-dena-muted">
          <span>{progress.toLocaleString("fa-IR")}٪ پیشرفت</span>
          <span>جلسه {currentSession.toLocaleString("fa-IR")} از {course.total.toLocaleString("fa-IR")}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-dena-lavender">
          <div className="h-full rounded-full bg-dena-mint" style={{ width: `${progress}%` }} />
        </div>
        <Link href={`/student-demo/courses/${course.id}/lessons/${lessonPath}`} className={buttonClassName() + " flex w-full justify-center"}>ادامه یادگیری</Link>
      </Card>

      <Card className="space-y-3 rounded-[20px] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-extrabold text-dena-deep">جلسه {currentSession.toLocaleString("fa-IR")} — {currentLesson}</h3>
          <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال یادگیری</span>
        </div>
        <Link href={`/student-demo/courses/${course.id}/lessons/${lessonPath}`} className={buttonClassName("outline") + " flex w-full justify-center"}>ادامه جلسه</Link>
      </Card>

      <Card className="space-y-4 rounded-[20px] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-extrabold text-dena-deep">تیم آموزشی دوره</h3>
          <Link href={`/student-demo/courses/${course.id}/team`} className="text-xs font-bold text-dena-brand">مشاهده همه</Link>
        </div>
        <div className="space-y-3">
          {teamRoles.map(role => (
            <Link key={role.id} href={`/student-demo/courses/${course.id}/team/${role.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-dena-border p-3">
              <span className="text-xs text-dena-muted">{role.title}</span>
              <span className="text-right"><span className="block text-sm font-bold text-dena-deep">{role.name}</span><span className="mt-1 block text-xs text-dena-muted">{role.detail}</span></span>
            </Link>
          ))}
        </div>
      </Card>

      <section className="space-y-3">
        <SectionHeading id="demo-lessons">محتوای دوره</SectionHeading>
        <ol className="space-y-2">
          {course.lessons.map((lesson, index) => (
            <li key={lesson}>
              <Link href={`/student-demo/courses/${course.id}/lessons/${course.id === "math-7" ? index + 1 : index + 1}`} className="flex items-center justify-between gap-4 rounded-xl border border-dena-border bg-white p-4 hover:border-dena-brand">
                <span className="text-sm font-bold text-dena-brand">مشاهده ←</span>
                <span className="text-right"><span className="block text-xs text-dena-muted">جلسه {index + 1}</span><span className="mt-1 block font-bold text-dena-ink">{lesson}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function LessonDetail({ course, lessonNumber, tab = "sessions" }: { course: DemoCourse; lessonNumber: number; tab?: string }) {
  const mathLessons = ["دامنه تابع", "مفهوم تابع", "تابع و نمودار", "انواع نمودار"];
  const lessons = course.id === "math-7" ? mathLessons : course.lessons;
  const lesson = lessons[lessonNumber - 1];
  if (!lesson) notFound();

  const courseSessions = course.id === "math-7"
    ? [
        { number: 6, title: "دامنه تابع", state: "completed" },
        { number: 7, title: "مفهوم تابع", state: "completed" },
        { number: 8, title: "تابع و نمودار", state: "current" },
        { number: 9, title: "انواع نمودار", state: "upcoming" },
        { number: 10, title: "تمرین نمودار", state: "upcoming" },
      ]
    : lessons.map((title, index) => ({ number: index + 1, title, state: index + 1 === lessonNumber ? "current" : "upcoming" }));
  const currentSessionNumber = course.id === "math-7" ? lessonNumber + 5 : lessonNumber;
  const previousLesson = Math.max(1, lessonNumber - 1);
  const nextLesson = Math.min(lessons.length, lessonNumber + 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="order-2 h-fit rounded-2xl border border-dena-border bg-white p-4 lg:order-1 lg:p-5">
          <h2 className="mb-4 text-right text-base font-extrabold text-dena-deep">محتوای این دوره</h2>
          <nav aria-label="بخش‌های جلسه" className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-dena-bg p-1 md:hidden">
            <Link href="?tab=sessions" aria-current={tab !== "notes" ? "page" : undefined} className={`rounded-full px-3 py-2 text-center text-xs font-bold ${tab !== "notes" ? "bg-white text-dena-brand shadow-sm" : "text-dena-muted"}`}>جلسات دوره</Link>
            <Link href="?tab=notes" aria-current={tab === "notes" ? "page" : undefined} className={`rounded-full px-3 py-2 text-center text-xs font-bold ${tab === "notes" ? "bg-white text-dena-brand shadow-sm" : "text-dena-muted"}`}>یادداشت من</Link>
          </nav>
          {tab === "notes" ? (
            <div className="rounded-xl bg-dena-bg p-4 text-right">
              <h3 className="font-bold text-dena-deep">یادداشت‌های من</h3>
              <p className="mt-2 text-sm leading-7 text-dena-muted">هنوز یادداشتی برای این جلسه ثبت نشده است.</p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {courseSessions.map(session => {
                const selected = session.number === currentSessionNumber;
                const completed = session.state === "completed";
                return (
                  <li key={session.number}>
                    <Link
                      href={`/student-demo/courses/${course.id}/lessons/${course.id === "math-7" ? session.number - 5 : session.number}`}
                      aria-current={selected ? "page" : undefined}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-right transition-colors ${selected ? "border-[1.5px] border-dena-brand bg-dena-lavender/50" : "border-dena-border bg-white hover:border-dena-brand"}`}
                    >
                      <span className={`shrink-0 text-[11px] font-semibold ${selected ? "text-dena-brand" : completed ? "text-emerald-700" : "text-dena-muted"}`}>
                        {selected ? "در حال یادگیری" : completed ? "تکمیل‌شده" : "شروع‌نشده"}
                      </span>
                      <span className={`text-sm font-semibold ${selected ? "text-dena-brand" : "text-dena-deep"}`}>جلسه {session.number.toLocaleString("fa-IR")} — {session.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>

        <main className="order-1 min-w-0 space-y-4 lg:order-2">
          <section aria-label="پخش ویدئوی آموزشی" className="overflow-hidden rounded-2xl bg-[#131124] text-white">
            <div className="relative grid h-[160px] place-items-center overflow-hidden bg-[#131124] md:h-[400px]">
              <div aria-hidden="true" className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, transparent 49.8%, #aaa 50%, transparent 50.2%), linear-gradient(to bottom, transparent 49.8%, #aaa 50%, transparent 50.2%)" }} />
              <svg aria-hidden="true" viewBox="0 0 600 220" className="absolute inset-0 m-auto h-[70%] w-[82%] opacity-25">
                <polyline points="0,170 100,125 195,145 290,85 390,105 500,45 600,62" fill="none" stroke="#d4d0ef" strokeWidth="2" />
              </svg>
              <span className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-white">ادامه از ۱۸:۴۲　▶</span>
              <div className="relative z-10 grid size-14 place-items-center rounded-full bg-white/20 text-2xl text-white ring-8 ring-white/10" aria-hidden="true">▶</div>
            </div>
            <div className="space-y-3 bg-[#1c1a30] p-3">
              <div className="relative h-1.5 rounded-full bg-[#4e4a75]" aria-label="پیشرفت نمونهٔ ویدئو">
                <div className="h-full w-[47%] rounded-full bg-dena-brand" />
                <span className="absolute left-[47%] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-white bg-dena-brand" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-white">
                  <span className="text-base opacity-80">▶</span>
                  <span dir="ltr">۱۸:۴۲ <span className="text-white/50">/ ۴۵:۱۰</span></span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/80">
                  <span>◖))</span><span className="rounded border border-white/40 px-1.5 py-0.5 text-[10px]">CC</span><span dir="ltr">1.0x</span><span>⛶</span>
                </div>
              </div>
            </div>
          </section>

          <Card className="space-y-3 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال یادگیری</span>
              <p className="text-xs font-bold text-dena-brand">{course.title} · جلسه {currentSessionNumber}</p>
            </div>
            <h2 className="text-lg font-extrabold text-dena-deep">{lesson}</h2>
            <p className="text-sm leading-6 text-dena-muted">مدرس: استاد احمدی</p>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:hidden">
            <Link href={`/student-demo/courses/${course.id}/lessons/${previousLesson}`} className="rounded-xl border border-dena-border bg-white p-3 text-right">
              <span className="block text-[11px] text-dena-muted">جلسه قبل</span>
              <span className="mt-1 block text-xs font-bold text-dena-brand">{courseSessions.find(x => x.number === currentSessionNumber - 1)?.title ?? "جلسه قبلی"}</span>
            </Link>
            <Link href={`/student-demo/courses/${course.id}/lessons/${nextLesson}`} className="rounded-xl border border-dena-border bg-white p-3 text-right">
              <span className="block text-[11px] text-dena-muted">جلسه بعدی</span>
              <span className="mt-1 block text-xs font-bold text-dena-brand">{courseSessions.find(x => x.number === currentSessionNumber + 1)?.title ?? "جلسه بعدی"}</span>
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <Card className="space-y-2 rounded-2xl p-4">
              <h3 className="font-extrabold text-dena-deep">درباره این جلسه</h3>
              <p className="text-sm leading-7 text-dena-muted">در این جلسه با مفهوم درس آشنا می‌شوی و نکته‌های اصلی را همراه با مثال مرور می‌کنی.</p>
            </Card>
            <Card className="space-y-2 rounded-2xl p-4">
              <p className="text-xs text-dena-muted">مدرس دوره</p>
              <p className="font-bold text-dena-deep">استاد احمدی</p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function CourseTeam({ course }: { course: DemoCourse }) {
  return (
    <div className="space-y-5">
      <Link href={`/student-demo/courses/${course.id}`} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به جزئیات دوره</Link>
      <section className="rounded-[22px] bg-dena-lavender p-6"><p className="text-sm font-bold text-dena-brand">{course.title}</p><h2 className="mt-2 text-2xl font-extrabold text-dena-deep">تیم آموزشی دوره</h2><p className="mt-2 text-sm leading-7 text-dena-muted">اعضا و راه‌های ارتباطی زیر نمونه‌اند و به افراد واقعی وصل نیستند.</p></section>
      <div className="grid gap-4 md:grid-cols-3">
        {teamRoles.map((member) => <Card key={member.id} className="space-y-4 rounded-[22px] p-5"><div><p className="text-xs font-bold text-dena-brand">{member.title}</p><h3 className="mt-2 text-lg font-extrabold">{member.name}</h3><p className="mt-2 text-sm text-dena-muted">{member.detail}</p></div><Link href={`/student-demo/courses/${course.id}/team/${member.id}`} className={buttonClassName("outline")}>مشاهده و ارتباط</Link></Card>)}
      </div>
    </div>
  );
}

function TeamMember({ course, roleId, conversation }: { course: DemoCourse; roleId: string; conversation: boolean }) {
  const member = teamRoles.find((item) => item.id === roleId);
  if (!member) notFound();
  return (
    <div className="space-y-5">
      <Link href={`/student-demo/courses/${course.id}/team`} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به تیم آموزشی</Link>
      <Card className="space-y-4 rounded-[22px] p-6 md:p-8"><p className="text-sm font-bold text-dena-brand">{member.title} · {course.title}</p><h2 className="text-2xl font-extrabold text-dena-deep">{member.name}</h2><p className="text-sm leading-7 text-dena-muted">{member.detail}. این عضو فقط در محدودهٔ همین دوره نمایش داده می‌شود.</p><Link href={`/student-demo/courses/${course.id}/team/${member.id}/conversation`} className={buttonClassName()}>گفت‌وگو</Link></Card>
      {conversation && <Card className="space-y-4 rounded-[22px] p-6"><h3 className="font-extrabold">گفت‌وگوی نمونه</h3><div className="space-y-3 text-sm leading-7"><p className="w-fit max-w-[85%] rounded-2xl bg-dena-bg p-4">سلام، برای این مبحث راهنمایی می‌خواهم.</p><p className="mr-auto w-fit max-w-[85%] rounded-2xl bg-dena-lavender p-4">سلام! لطفاً بگو کدام بخش درس برایت دشوار است.</p></div><p className="border-t border-dena-border pt-3 text-xs text-dena-muted">پیام‌ها نمونه‌اند؛ ارسال پیام در حالت نمایش فعال نیست.</p></Card>}
    </div>
  );
}

function AiTutor() {
  const learningStages = [
    {
      number: "۱",
      title: "آموزش آغازین با دیتاست دنا",
      status: "مرحلهٔ پایه",
      description: "نسخهٔ آغازین معلم دنا با داده‌های آموزشی دیتاست دنا شروع می‌شود.",
    },
    {
      number: "۲",
      title: "یادگیری از ویدئوهای دوره",
      status: "جست‌وجوی رونوشت",
      description: "برای ویدئوهای دارای مجوز، رونوشت دستی جست‌وجو می‌شود و فقط محتوای دوره‌های مجاز همان دانش‌آموز در دسترس است. فایل خام ویدئو پردازش نمی‌شود.",
    },
    {
      number: "۳",
      title: "تمرین متناسب با مسیر تو",
      status: "پیشنهاد تمرین",
      description: "با فعال‌کردن ثبت موضوع، تمرین همان مبحث پیشنهاد می‌شود. ذخیرهٔ نتیجه رضایت جداگانه می‌خواهد؛ متن پرسش و پاسخ برای بازخورد ویدئو ذخیره نمی‌شود.",
    },
  ] as const;

  return (
    <div dir="rtl" className="space-y-7 text-right md:space-y-9">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] p-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:p-9">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-center">
          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50">
              <span className="size-1.5 rounded-full bg-amber-300" />
              در حال آماده‌سازی
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-relaxed md:text-[32px]">معلم هوشمند دنا</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-indigo-100 md:text-base">
              همراهی برای فهم بهتر درس‌ها و پیدا کردن قدم بعدی در مسیر یادگیری؛ متناسب با دوره‌هایی که دنبال می‌کنی.
            </p>
            <div className="mt-5 flex flex-wrap justify-start gap-3">
              <Link href="#demo-ai-growth" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-extrabold text-[#3729a8] shadow-sm transition hover:bg-indigo-50">آشنایی با مسیر یادگیری</Link>
              <Link href="/student-demo/courses" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15">دیدن دوره‌های من</Link>
            </div>
          </div>
          <div className="rounded-[22px] border border-white/15 bg-white/10 p-5 text-right backdrop-blur-sm">
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/15 text-2xl" aria-hidden="true">✦</div>
            <p className="text-sm font-bold text-indigo-100">یادگیری قدم‌به‌قدم</p>
            <p className="mt-2 text-2xl font-extrabold">از پرسش تا تمرین</p>
            <div className="mt-5 flex items-center gap-2">
              <span className="h-1.5 flex-1 rounded-full bg-white/20"><span className="block h-full w-1/3 rounded-full bg-emerald-300" /></span>
              <span className="text-xs font-semibold text-indigo-100">۳ گام</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
        <Card className="overflow-hidden rounded-[24px] border-dena-border p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dena-border px-5 py-4 md:px-6">
            <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-[11px] font-bold text-dena-brand">پیش‌نمایش</span>
            <div className="text-right">
              <h3 className="font-extrabold text-dena-deep">نمونهٔ گفت‌وگو</h3>
              <p className="mt-1 text-xs text-dena-muted">یک نمونهٔ کوتاه از راهنمایی درسی</p>
            </div>
          </div>
          <div className="space-y-5 bg-gradient-to-b from-white to-[#faf9ff] p-5 md:p-6">
            <div className="flex items-end gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-dena-bg text-sm font-extrabold text-dena-brand" aria-hidden="true">م</span>
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-dena-bg px-4 py-3 text-sm leading-7 text-dena-ink">
                چطور عدد منفی را در عدد منفی ضرب کنم؟
              </div>
            </div>
            <div className="flex items-end justify-end gap-3">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-dena-lavender px-4 py-3 text-sm leading-7 text-dena-deep">
                در ضرب دو عدد منفی، حاصل مثبت می‌شود. برای نمونه:
                <span dir="ltr" className="mx-1 inline-block rounded-lg bg-white/80 px-2 py-0.5 font-bold">(−۳) × (−۲) = ۶</span>
                پس جواب مثبت است.
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-dena-brand text-lg text-white" aria-hidden="true">✦</span>
            </div>
            <div className="flex items-center gap-2 border-t border-dena-border pt-4 text-xs leading-6 text-dena-muted">
              <span className="text-dena-brand" aria-hidden="true">ⓘ</span>
              این گفت‌وگو نمونهٔ رابط است؛ در وضعیت فعلی پرسشی به مدل ارسال یا سابقه‌ای ذخیره نمی‌شود.
            </div>
          </div>
        </Card>

        <Card className="rounded-[24px] border-dena-border bg-white p-5 md:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-dena-lavender text-lg text-dena-brand" aria-hidden="true">◈</span>
            <div>
              <h3 className="font-extrabold text-dena-deep">یادگیری با حریم خصوصی</h3>
              <p className="mt-2 text-sm leading-7 text-dena-muted">محتوای در دسترس معلم به دوره‌های مجاز تو محدود می‌ماند و کنترل ثبت موضوع و نتیجه با رضایت تو انجام می‌شود.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 border-t border-dena-border pt-4 text-sm leading-6 text-dena-ink">
            <li className="flex items-start gap-2"><span className="mt-1 text-emerald-500" aria-hidden="true">✓</span><span>پاسخ‌گویی بر پایهٔ داده‌های آموزشی دنا</span></li>
            <li className="flex items-start gap-2"><span className="mt-1 text-emerald-500" aria-hidden="true">✓</span><span>استفاده از محتوای مجاز دوره‌های خودت</span></li>
            <li className="flex items-start gap-2"><span className="mt-1 text-emerald-500" aria-hidden="true">✓</span><span>ذخیرهٔ نتیجه با رضایت جداگانه</span></li>
          </ul>
          <p className="mt-5 rounded-xl bg-dena-bg px-4 py-3 text-xs leading-6 text-dena-muted">گفت‌وگو پس از آماده‌سازی و ارزیابی سرویس فعال می‌شود.</p>
        </Card>
      </section>

      <section className="space-y-4 scroll-mt-6">
        <SectionHeading id="demo-ai-growth" note="بر اساس وضعیت فعلی معلم دنا">
          مسیر یادگیری معلم هوشمند
        </SectionHeading>
        <ol className="grid gap-4 lg:grid-cols-3">
          {learningStages.map((stage) => (
            <li key={stage.number}>
              <Card className="group h-full rounded-[22px] border-dena-border p-5 transition duration-200 hover:-translate-y-0.5 hover:border-dena-brand/30 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-dena-lavender text-sm font-extrabold text-dena-brand">{stage.number}</span>
                  <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-semibold text-dena-muted">{stage.status}</span>
                </div>
                <div className="mt-5">
                  <h3 className="font-extrabold leading-7 text-dena-ink">{stage.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-dena-muted">{stage.description}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
function AssessmentsDemo({ filter = "all", detail }: { filter?: string; detail?: string }) {
  const items = [
    { id: "math-7-practice", title: "آزمون فصل سوم ریاضی", course: "ریاضی دهم", status: "ready", label: "آماده انجام", date: "امروز" },
    { id: "physics-light", title: "تمرین فیزیک — نور", course: "فیزیک دهم", status: "pending", label: "در انتظار", date: "فردا" },
    { id: "chemistry-ch2", title: "آزمون فصل دوم شیمی", course: "شیمی دهم", status: "completed", label: "انجام‌شده", date: "۲ روز پیش" },
  ];
  if (detail) {
    const item=items.find(x=>x.id===detail);
    if(!item) notFound();
    const ready=item.status==="ready";
    const badgeClass=ready?"bg-dena-lavender text-dena-brand":item.status==="completed"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800";
    return <div className="mx-auto max-w-5xl space-y-5">
      <div className="md:hidden">
        <Card className="space-y-5 rounded-2xl p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${badgeClass}`}>{item.label}</span>
              <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-brand">آزمون یادگیری</span>
            </div>
            <div className="space-y-1 text-right">
              <h2 className="text-lg font-extrabold text-dena-deep">{item.title}</h2>
              <p className="text-sm text-dena-muted">{item.course}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-dena-border pt-4">
            <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs text-dena-muted">مؤسسه آموزشی البرز</span>
            <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-semibold text-dena-brand">تابع و نمودار</span>
          </div>

          <p className="text-sm leading-7 text-dena-muted">این آزمون برای مرور مباحث فصل سوم آماده شده است. پرسش‌ها به‌صورت تصادفی از بانک سؤال مؤسسه انتخاب می‌شوند.</p>

          <dl className="grid grid-cols-2 gap-2 border-y border-dena-border py-4">
            {[["۱۰ پرسش","تعداد پرسش‌ها"],["۱۵ دقیقه","زمان پیشنهادی"],["چهارگزینه‌ای","ساختار"],["تصادفی","انتخاب پرسش‌ها"]].map(([value,label])=><div key={label} className="rounded-xl bg-dena-bg p-3 text-right"><dd className="font-bold text-dena-deep">{value}</dd><dt className="mt-1 text-xs text-dena-muted">{label}</dt></div>)}
          </dl>

          <section className="space-y-3">
            <h3 className="text-sm font-extrabold text-dena-deep">پیش از شروع آزمون</h3>
            <ul className="space-y-3 text-[13px] leading-6 text-dena-muted">
              <li className="flex items-start gap-2"><span className="font-bold text-dena-brand">✓</span><span>همهٔ پرسش‌ها چهارگزینه‌ای هستند.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-dena-brand">✓</span><span>پرسش‌ها به‌صورت تصادفی انتخاب می‌شوند.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-dena-brand">✓</span><span>پاسخ‌ها را پیش از ارسال نهایی بررسی کن.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-dena-brand">✓</span><span>اگر نتیجهٔ آزمون نیاز به تلاش دوباره داشته باشد، ابتدا جلسهٔ آموزشی مرتبط را مرور کن. تا تکمیل مرور، تلاش جدید فعال نمی‌شود.</span></li>
            </ul>
          </section>

          <div className="space-y-3 border-t border-dena-border pt-4">
            {ready?<Link href="/student-demo/assessments/math-7-practice/start" className={buttonClassName()+ " flex w-full justify-center"}>شروع آزمون</Link>:<div className="rounded-xl bg-dena-bg p-3 text-center text-sm font-semibold text-dena-muted">{item.status==="completed"?"نتیجهٔ نمونه؛ پاسخ واقعی ثبت نشده":"این آزمون هنوز آمادهٔ شروع نیست"}</div>}
            <Link href="/student-demo/assessments" className="flex w-full justify-center rounded-xl border border-dena-border bg-white px-4 py-3 text-sm font-bold text-dena-brand">بازگشت به تمرین‌ها و آزمون‌ها</Link>
          </div>
        </Card>
      </div>

      <div className="hidden space-y-5 md:block">
        <Card className="space-y-5 rounded-[20px] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className={`rounded-full px-3 py-2 text-xs font-bold ${badgeClass}`}>{item.label}</span>
            <div className="text-right"><h2 className="text-xl font-extrabold text-dena-deep">{item.title}</h2><p className="mt-1 text-sm text-dena-muted">{item.course}</p></div>
          </div>
          <div className="grid gap-3 rounded-xl bg-dena-bg p-4 sm:grid-cols-2">
            <div className="text-right"><p className="text-xs text-dena-muted">ارائه آموزشی این دوره</p><p className="mt-1 font-bold text-dena-deep">مؤسسه آموزشی البرز</p><p className="mt-1 text-xs leading-6 text-dena-muted">محتوا و همراهی آموزشی این دوره توسط مؤسسه آموزشی البرز ارائه می‌شود.</p></div>
            <div className="space-y-3 text-right sm:border-r sm:border-dena-border sm:pr-4"><p className="text-sm font-semibold text-dena-deep">مدرس: استاد احمدی</p><p className="text-sm text-dena-muted">دوره مرتبط: {item.course}</p><p className="text-xs text-dena-muted">آخرین فعالیت شما در این دوره امروز ثبت شده است.</p></div>
          </div>
        </Card>

        <Card className="space-y-5 rounded-[20px] p-5 md:p-6">
          <div className="space-y-3 text-right"><h3 className="text-lg font-extrabold text-dena-deep">جزئیات آزمون</h3><p className="font-bold text-dena-deep">{item.title}</p><p className="text-sm text-dena-muted">{item.course}</p></div>
          <div className="grid gap-3 rounded-xl border border-dena-border bg-dena-bg p-4 sm:grid-cols-2">
            <p className="text-sm text-dena-muted">مؤسسه آموزشی البرز</p><p className="text-sm font-bold text-dena-deep sm:text-right">تابع و نمودار</p>
            <p className="text-sm leading-7 text-dena-muted sm:col-span-2">این آزمون برای مرور مباحث فصل سوم آماده شده است. پرسش‌های این نسخه نمونه‌اند و نتیجهٔ واقعی ثبت نمی‌شود.</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["۱۰ پرسش","تعداد پرسش‌ها"],["حدود ۱۵ دقیقه","زمان پیشنهادی"],["آزمون یادگیری","نوع آزمون"],["چهارگزینه‌ای","ساختار"],["تصادفی","ترتیب پرسش‌ها"]].map(([value,label])=><div key={label} className="rounded-xl border border-dena-border p-4 text-right"><dd className="font-bold text-dena-deep">{value}</dd><dt className="mt-1 text-xs text-dena-muted">{label}</dt></div>)}</dl>
        </Card>

        <Card className="space-y-4 rounded-[20px] p-5 md:p-6">
          <h3 className="text-base font-extrabold text-dena-deep">پیش از شروع آزمون</h3>
          <ul className="space-y-3 text-sm leading-7 text-dena-ink">
            <li className="flex gap-3"><span className="text-dena-brand">✓</span><span>همهٔ پرسش‌ها چهارگزینه‌ای هستند.</span></li>
            <li className="flex gap-3"><span className="text-dena-brand">✓</span><span>پرسش‌ها به‌صورت تصادفی برای این تلاش انتخاب می‌شوند.</span></li>
            <li className="flex gap-3"><span className="text-dena-brand">✓</span><span>پاسخ‌ها را پیش از ارسال نهایی بررسی کن.</span></li>
            <li className="flex gap-3"><span className="text-dena-brand">✓</span><span>اگر نتیجهٔ آزمون با انتظارت هماهنگ نبود، می‌توانی آن را با مدرس دوره مرور کنی.</span></li>
          </ul>
          <div className="grid gap-3 rounded-xl bg-dena-bg p-4 sm:grid-cols-2"><div className="text-right"><p className="text-xs text-dena-muted">دوره مرتبط</p><p className="mt-1 font-semibold">{item.course}</p></div><div className="text-right"><p className="text-xs text-dena-muted">جلسه مرتبط</p><p className="mt-1 font-semibold">تابع و نمودار</p></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-4"><Link href="/student-demo/assessments" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به تمرین‌ها و آزمون‌ها</Link>{ready?<Link href="/student-demo/assessments/math-7-practice/start" className={buttonClassName()}>شروع آزمون</Link>:<span className="rounded-xl bg-dena-bg px-4 py-3 text-sm font-semibold text-dena-muted">{item.status==="completed"?"نتیجهٔ نمونه؛ پاسخ واقعی ثبت نشده":"این آزمون هنوز آمادهٔ شروع نیست"}</span>}</div>
        </Card>
      </div>
    </div>;
  }
  const filtered=filter==="all"?items:items.filter(item=>item.status===filter);
  const readyCount=items.filter(item=>item.status==="ready").length;
  const pendingCount=items.filter(item=>item.status==="pending").length;
  const completedCount=items.filter(item=>item.status==="completed").length;
  return (
    <div dir="rtl" className="space-y-6 text-right md:space-y-8">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] px-5 py-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:px-8 md:py-8">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-50">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              برنامهٔ یادگیری تو
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-relaxed md:text-[32px]">تمرین‌ها و آزمون‌ها</h2>
            <p className="mt-1 text-sm leading-7 text-indigo-100 md:text-base">فعالیت‌های آموزشی دوره‌هایت را دنبال کن و قدم بعدی را بردار.</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:min-w-[390px] md:gap-3">
            {[[readyCount.toLocaleString("fa-IR"), "آماده انجام"], [pendingCount.toLocaleString("fa-IR"), "در انتظار"], [completedCount.toLocaleString("fa-IR"), "انجام‌شده"]].map(([value,label])=>(
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-2 py-4 text-center backdrop-blur-sm md:px-4">
                <p className="text-xl font-extrabold md:text-2xl">{value}</p>
                <p className="mt-1 text-[10px] leading-5 text-indigo-100 md:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/student-demo/courses" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-dena-border bg-white px-4 text-sm font-bold text-dena-brand transition hover:border-dena-brand hover:bg-dena-lavender">
          <span aria-hidden="true">▤</span>
          دیدن دوره‌های من
        </Link>
        <nav aria-label="فیلتر فعالیت‌ها" className="flex w-fit flex-wrap gap-1 rounded-2xl bg-dena-bg p-1.5">
          {[["all","همه"],["ready","آماده انجام"],["pending","در انتظار"],["completed","انجام‌شده"]].map(([key,label])=>(
            <Link key={key} href={key==="all"?"/student-demo/assessments":`/student-demo/assessments?filter=${key}`} aria-current={filter===key?"page":undefined}
              className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${filter===key?"bg-white text-dena-brand shadow-sm":"text-dena-muted hover:text-dena-brand"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {filter==="all"&&<Card className="relative overflow-hidden rounded-[24px] border-dena-brand/15 bg-gradient-to-l from-dena-lavender/80 to-white p-5 md:p-6">
        <div aria-hidden="true" className="absolute -left-10 -top-12 size-32 rounded-full bg-violet-100/60 blur-xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-right">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">پیشنهاد برای امروز</span>
            <h3 className="mt-3 text-lg font-extrabold text-dena-deep">آزمون فصل سوم ریاضی</h3>
            <p className="mt-1 text-sm text-dena-muted">ریاضی دهم · تابع و نمودار · حدود ۱۵ دقیقه</p>
          </div>
          <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName()+" inline-flex min-h-11 items-center justify-center gap-2 px-5"}>
            <span>جزئیات و شروع آزمون</span><span aria-hidden="true">←</span>
          </Link>
        </div>
      </Card>}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-dena-muted">برنامهٔ درسی</p>
            <h3 className="mt-1 text-xl font-extrabold text-dena-deep">{filter==="all"?"همهٔ فعالیت‌ها":filter==="ready"?"فعالیت‌های آماده":filter==="pending"?"فعالیت‌های در انتظار":"فعالیت‌های انجام‌شده"}</h3>
          </div>
          <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-muted">{filtered.length.toLocaleString("fa-IR")} فعالیت</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(item=>{
            const ready=item.status==="ready";
            const completed=item.status==="completed";
            const badge=completed?"bg-emerald-50 text-emerald-700":ready?"bg-dena-lavender text-dena-brand":"bg-amber-50 text-amber-800";
            const icon=completed?"✓":ready?"✦":"◷";
            return <Card key={item.id} className="group overflow-hidden rounded-[24px] border-dena-border p-0 transition duration-200 hover:-translate-y-0.5 hover:border-dena-brand/25 hover:shadow-lg">
              <div className={`flex items-center justify-between gap-4 border-b border-dena-border p-5 md:px-6 ${ready?"bg-gradient-to-l from-dena-lavender/70 to-white":completed?"bg-gradient-to-l from-emerald-50 to-white":"bg-gradient-to-l from-amber-50 to-white"}`}>
                <div className="min-w-0 text-right">
                  <h4 className="truncate font-extrabold text-dena-deep">{item.title}</h4>
                  <p className="mt-1 text-xs text-dena-muted">{item.course}</p>
                </div>
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold ${badge}`} aria-hidden="true">{icon}</span>
              </div>
              <div className="space-y-4 p-5 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${badge}`}>{item.label}</span>
                  <span className="text-xs text-dena-muted">{completed?"آخرین فعالیت":ready?"زمان پیشنهادی":"زمان برنامه‌ریزی‌شده"}: {item.date}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-4">
                  <span className="text-xs text-dena-muted">{completed?"آزمون ثبت‌شده":ready?"آمادهٔ شروع":"در انتظار آماده‌شدن"}</span>
                  <Link href={`/student-demo/assessments/${item.id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-dena-brand transition hover:bg-dena-lavender">
                    {completed?"مشاهده نتیجه":ready?"جزئیات و شروع":"مشاهده جزئیات"}
                  </Link>
                </div>
              </div>
            </Card>;
          })}
        </div>
        {filtered.length===0&&<Card className="rounded-[24px] border-dena-border p-8 text-center text-sm text-dena-muted">در این وضعیت فعالیتی برای نمایش نیست.</Card>}
      </section>
      <p className="rounded-2xl bg-dena-bg px-4 py-3 text-xs leading-6 text-dena-muted">فعالیت‌ها و وضعیت‌ها برای پیش‌نمایش هستند؛ نتیجهٔ واقعی ثبت نمی‌شود.</p>
    </div>
  );
}
function GrowthDemo() {
  const courses = [
    { id: "math-7", name: "ریاضی دهم", provider: "مؤسسه آموزشی البرز", progress: 75, detail: "۱۸ جلسه از ۲۴ جلسه", tone: "bg-indigo-500" },
    { id: "science-7", name: "فیزیک دهم", provider: "آموزشگاه نور دانش", progress: 60, detail: "۱۲ جلسه از ۲۰ جلسه", tone: "bg-cyan-500" },
    { id: "chemistry-10", name: "شیمی دهم", provider: "مرکز علمی پژوهان", progress: 45, detail: "۸ جلسه از ۱۸ جلسه", tone: "bg-emerald-500" },
  ];
  const activity = [
    { day: "امروز", title: "جلسهٔ تابع و نمودار را دیدی", detail: "ریاضی دهم", icon: "✓", tone: "bg-emerald-50 text-emerald-700" },
    { day: "دیروز", title: "تمرین نور را مرور کردی", detail: "فیزیک دهم", icon: "↻", tone: "bg-cyan-50 text-cyan-700" },
    { day: "۳ روز پیش", title: "جلسهٔ ساختار اتم را تکمیل کردی", detail: "شیمی دهم", icon: "✓", tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <div dir="rtl" className="space-y-6 text-right md:space-y-8">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] px-5 py-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:px-8 md:py-8">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-50">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              گزارش یادگیری تو · دادهٔ نمونه
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-relaxed md:text-[32px]">مسیر رشد من</h2>
            <p className="mt-1 text-sm leading-7 text-indigo-100 md:text-base">پیشرفت دوره‌ها، فعالیت‌های اخیر و قدم بعدی یادگیری‌ات را یک‌جا ببین.</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:min-w-[390px] md:gap-3">
            {[
              ["۳", "دورهٔ فعال"],
              ["۴", "جلسهٔ این هفته"],
              ["۶۸٪", "هدف هفتگی"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-2 py-4 text-center backdrop-blur-sm md:px-4">
                <p className="text-xl font-extrabold md:text-2xl">{value}</p>
                <p className="mt-1 text-[10px] leading-5 text-indigo-100 md:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="relative overflow-hidden rounded-[24px] border-0 bg-[#f0edff] p-5 md:p-6">
          <div aria-hidden="true" className="absolute -left-8 -top-8 size-32 rounded-full bg-white/70 blur-xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-dena-brand">قدم بعدی پیشنهادی</span>
              <h3 className="mt-3 text-lg font-extrabold text-dena-deep">ادامهٔ جلسهٔ تابع و نمودار</h3>
              <p className="mt-1 text-sm text-dena-muted">ریاضی دهم · جلسهٔ ۸ از ۲۴</p>
            </div>
            <Link href="/student-demo/courses/math-7/lessons/3" className={buttonClassName() + " inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-5"}>
              ادامهٔ یادگیری <span aria-hidden="true">←</span>
            </Link>
          </div>
        </Card>
        <Card className="flex items-center gap-4 rounded-[24px] border-dena-border p-5 md:p-6">
          <div className="grid size-[76px] shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#27c9a4 0 68%, #eeeaff 68% 100%)" }}>
            <div className="grid size-[58px] place-items-center rounded-full bg-white text-sm font-extrabold text-dena-deep">۶۸٪</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-dena-muted">پیشرفت هفتگی</p>
            <h3 className="mt-1 font-extrabold text-dena-deep">ریتم خوبی داری!</h3>
            <p className="mt-1 text-xs leading-6 text-dena-muted">۴ جلسه و ۲ تمرین در این هفته تکمیل شده است.</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <Card className="space-y-5 rounded-[24px] border-dena-border p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-dena-muted">بر پایهٔ فعالیت‌های ثبت‌شده در دمو</p>
              <h3 className="mt-1 text-lg font-extrabold text-dena-deep">روند یادگیری</h3>
            </div>
            <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-muted">ریاضی دهم</span>
          </div>
          <div className="rounded-2xl bg-dena-bg p-4">
            <div className="flex items-center justify-between text-[11px] text-dena-muted"><span>شاخص نمونه</span><span>شروع دوره تا امروز</span></div>
            <div className="mt-4 grid grid-cols-6 items-end gap-2" role="img" aria-label="روند نمونهٔ شاخص یادگیری در شش مقطع">
              {[42, 48, 56, 53, 62, 68].map((value, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-dena-muted">{value.toLocaleString("fa-IR")}</span>
                  <div className="flex h-32 w-full items-end rounded-t-lg bg-white">
                    <div className={"w-full rounded-t-lg " + (index === 5 ? "bg-dena-brand" : "bg-dena-mint")} style={{ height: value + "%" }} />
                  </div>
                  <span className="text-center text-[9px] leading-4 text-dena-muted">{["شروع", "ارزیابی", "فصل ۱", "مرور", "فصل ۲", "اکنون"][index]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-dena-border rounded-2xl border border-dena-border bg-white px-2 py-3 text-right">
            {[["شروع دوره", "۴۲", "text-dena-deep"], ["تغییر", "+۲۶", "text-emerald-600"], ["اکنون", "۶۸", "text-dena-brand"]].map(([label, value, tone]) => (
              <div key={label} className="px-3">
                <p className="text-[11px] text-dena-muted">{label}</p>
                <p className={"mt-1 text-lg font-extrabold " + tone}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-6 text-dena-muted">این شاخص‌ها نمونه‌اند و نمرهٔ رسمی یا اثبات یادگیری محسوب نمی‌شوند.</p>
        </Card>

        <Card className="space-y-5 rounded-[24px] border-dena-border p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold text-dena-muted">نمای کلی</p>
            <h3 className="mt-1 text-lg font-extrabold text-dena-deep">دوره‌های من</h3>
          </div>
          <div className="space-y-5">
            {courses.map((course) => (
              <div key={course.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <Link href={"/student-demo/courses/" + course.id} className="text-sm font-extrabold text-dena-deep hover:text-dena-brand">{course.name}</Link>
                    <p className="mt-1 text-[11px] text-dena-muted">{course.provider}</p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-dena-brand">{course.progress.toLocaleString("fa-IR")}٪</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-dena-lavender">
                  <div className={"h-full rounded-full " + course.tone} style={{ width: course.progress + "%" }} />
                </div>
                <p className="text-[11px] text-dena-muted">{course.detail}</p>
              </div>
            ))}
          </div>
          <Link href="/student-demo/courses" className="flex min-h-10 items-center justify-center rounded-xl border border-dena-border text-xs font-bold text-dena-brand transition hover:bg-dena-lavender">رفتن به دوره‌های من</Link>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="space-y-4 rounded-[24px] border-dena-border p-5 md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-dena-muted">به‌تازگی</p>
              <h3 className="mt-1 text-lg font-extrabold text-dena-deep">فعالیت‌های یادگیری</h3>
            </div>
            <Link href="/student-demo/assessments" className="text-xs font-bold text-dena-brand hover:underline">تمرین‌ها و آزمون‌ها ←</Link>
          </div>
          <ol className="space-y-3">
            {activity.map((item) => (
              <li key={item.title} className="flex items-center gap-3 rounded-2xl border border-dena-border bg-white p-3.5">
                <span className={"grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold " + item.tone} aria-hidden="true">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-dena-deep">{item.title}</p>
                  <p className="mt-1 text-xs text-dena-muted">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] text-dena-muted">{item.day}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="flex flex-col justify-between gap-5 rounded-[24px] border-dena-border bg-gradient-to-bl from-white to-dena-lavender/60 p-5 md:p-6">
          <div>
            <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-dena-brand">نشان این هفته</span>
            <div className="mt-4 flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-2xl text-amber-600" aria-hidden="true">✦</span>
              <div>
                <h3 className="font-extrabold text-dena-deep">پیوستگی در یادگیری</h3>
                <p className="mt-1 text-sm leading-6 text-dena-muted">چند روز پیاپی برای یادگیری وقت گذاشتی.</p>
              </div>
            </div>
          </div>
          <Link href="/student-demo/elite-club" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-dena-brand/20 bg-white px-4 text-xs font-bold text-dena-brand transition hover:border-dena-brand">دیدن فرصت‌های باشگاه نخبگان</Link>
        </Card>
      </section>

      <p className="rounded-2xl bg-dena-bg px-4 py-3 text-xs leading-6 text-dena-muted">تمام داده‌های این صفحه برای پیش‌نمایش رابط هستند و به حساب واقعی وصل نیستند.</p>
    </div>
  );
}

function ProfileDemo({ edit = false }: { edit?: boolean }) {
  if (edit) return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-5 text-right">
      <Link href="/student-demo/profile" className="inline-flex items-center gap-2 text-sm font-bold text-dena-brand hover:underline">
        <span aria-hidden="true">→</span> بازگشت به پروفایل
      </Link>
      <Card className="overflow-hidden rounded-[24px] border-dena-border p-0">
        <div className="border-b border-dena-border bg-gradient-to-l from-dena-lavender to-white px-5 py-6 md:px-7">
          <p className="text-xs font-bold text-dena-brand">اطلاعات حساب</p>
          <h2 className="mt-2 text-xl font-extrabold text-dena-deep md:text-2xl">ویرایش پروفایل</h2>
          <p className="mt-1 text-sm leading-6 text-dena-muted">اطلاعات پایهٔ نمایشی حساب دانش‌آموز.</p>
        </div>
        <div className="space-y-5 p-5 md:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-dena-muted">
              <span>نام</span>
              <input readOnly value="محمد" className="w-full rounded-xl border border-dena-border bg-dena-bg px-4 py-3 text-dena-deep outline-none" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-dena-muted">
              <span>نام خانوادگی</span>
              <input readOnly value="علوی" className="w-full rounded-xl border border-dena-border bg-dena-bg px-4 py-3 text-dena-deep outline-none" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-dena-muted">
              <span>پایه و رشته</span>
              <input readOnly value="دهم تجربی" className="w-full rounded-xl border border-dena-border bg-dena-bg px-4 py-3 text-dena-deep outline-none" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-dena-muted">
              <span>شماره ورود</span>
              <input dir="ltr" readOnly value="۰۹۱۲••••••••" className="w-full rounded-xl border border-dena-border bg-dena-bg px-4 py-3 text-left text-dena-deep outline-none" />
            </label>
          </div>
          <div className="flex flex-col gap-3 border-t border-dena-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-dena-muted">این پیش‌نمایش به حساب واقعی متصل نیست؛ تغییرات ذخیره نمی‌شوند.</p>
            <div className="flex gap-3">
              <Link href="/student-demo/profile" className={buttonClassName("outline") + " inline-flex min-h-10 items-center justify-center px-4"}>انصراف</Link>
              <button type="button" disabled className={buttonClassName() + " min-h-10 opacity-50"}>ذخیرهٔ تغییرات</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const rows = [
    { label: "نام و نام خانوادگی", value: "محمد علوی" },
    { label: "شمارهٔ ورود", value: "۰۹۱۲••••••••", ltr: true },
  ];

  return (
    <div dir="rtl" className="space-y-6 text-right md:space-y-8">
      <h1 className="text-2xl font-extrabold text-dena-deep">پروفایل کاربری</h1>
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] px-5 py-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:px-8 md:py-8">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-[22px] border border-white/20 bg-white/15 text-2xl font-extrabold text-white shadow-sm md:size-[76px]" aria-hidden="true">م</span>
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-indigo-50">حساب دانش‌آموز</span>
              <h2 className="mt-2 text-2xl font-extrabold md:text-[30px]">محمد علوی</h2>
              <p className="mt-1 text-sm text-indigo-100">پایهٔ دهم · علوم تجربی</p>
            </div>
          </div>
          <Link href="/student-demo/profile/edit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#3729a8] shadow-sm transition hover:bg-indigo-50">
            <span aria-hidden="true">✎</span> ویرایش اطلاعات
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="space-y-5 rounded-[24px] border-dena-border p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-dena-muted">مشخصات حساب</p>
              <h3 className="mt-1 text-lg font-extrabold text-dena-deep">اطلاعات شخصی</h3>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-dena-lavender text-dena-brand" aria-hidden="true">◎</span>
          </div>
          <dl className="divide-y divide-dena-border">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-1 last:pb-1">
                <dd dir={row.ltr ? "ltr" : undefined} className={"text-sm font-bold text-dena-deep " + (row.ltr ? "text-left" : "text-right")}>{row.value}</dd>
                <dt className="text-xs text-dena-muted">{row.label}</dt>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-4">
            <Link href="/student-demo/profile/change-phone" className="text-sm font-bold text-dena-brand hover:underline">تغییر شمارهٔ ورود</Link>
            <span className="text-xs text-dena-muted">نیازمند تأیید شمارهٔ جدید</span>
          </div>
        </Card>

        <Card className="space-y-5 rounded-[24px] border-dena-border p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-dena-muted">مشخصات تحصیلی</p>
              <h3 className="mt-1 text-lg font-extrabold text-dena-deep">وضعیت آموزشی</h3>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700" aria-hidden="true">▤</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl bg-dena-bg p-4">
              <p className="text-xs text-dena-muted">پایهٔ تحصیلی</p>
              <p className="mt-1 font-extrabold text-dena-deep">دهم</p>
            </div>
            <div className="rounded-2xl bg-dena-bg p-4">
              <p className="text-xs text-dena-muted">رشته</p>
              <p className="mt-1 font-extrabold text-dena-deep">علوم تجربی</p>
            </div>
          </div>
          <p className="text-xs leading-6 text-dena-muted">این اطلاعات در پیش‌نمایش فقط برای نمایش چیدمان پروفایل استفاده می‌شوند.</p>
        </Card>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/student-demo/profile/privacy" className="group flex items-start gap-4 rounded-[22px] border border-dena-border bg-white p-5 text-right transition hover:-translate-y-0.5 hover:border-dena-brand/30 hover:shadow-lg md:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-lg text-violet-700" aria-hidden="true">◈</span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-dena-deep">حریم خصوصی و داده‌ها</span>
            <span className="mt-1 block text-sm leading-6 text-dena-muted">اطلاعات و دسترسی‌های مربوط به حساب را مرور کن.</span>
          </span>
          <span className="text-lg text-dena-muted transition group-hover:text-dena-brand" aria-hidden="true">←</span>
        </Link>
        <Link href="/student-demo/support" className="group flex items-start gap-4 rounded-[22px] border border-dena-border bg-white p-5 text-right transition hover:-translate-y-0.5 hover:border-dena-brand/30 hover:shadow-lg md:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg text-emerald-700" aria-hidden="true">?</span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-dena-deep">راهنمایی و پشتیبانی</span>
            <span className="mt-1 block text-sm leading-6 text-dena-muted">برای پرسش‌های مربوط به حساب و یادگیری، درخواست بفرست.</span>
          </span>
          <span className="text-lg text-dena-muted transition group-hover:text-dena-brand" aria-hidden="true">←</span>
        </Link>
      </section>

      <div className="flex flex-col items-start justify-between gap-3 rounded-[22px] border border-rose-100 bg-rose-50/60 p-5 sm:flex-row sm:items-center">
        <div className="text-right">
          <h3 className="text-sm font-extrabold text-rose-800">خروج از حساب کاربری</h3>
          <p className="mt-1 text-xs leading-6 text-rose-700/80">در حالت پیش‌نمایش، خروج از حساب غیرفعال است.</p>
        </div>
        <button type="button" disabled className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 opacity-60">خروج از حساب</button>
      </div>

      <p className="rounded-2xl bg-dena-bg px-4 py-3 text-xs leading-6 text-dena-muted">اطلاعات نمایشی است و به حساب واقعی دانش‌آموز متصل نیست.</p>
    </div>
  );
}
function GenericDemo({ section }: { section: keyof typeof pages }) {
  if (section === "profile") return <ProfileDemo />;
  if (section === "growth") return <GrowthDemo />;
  if (section === "services") return <StudentDemoServiceCenter />;
  if (section === "notifications") return <StudentDemoSupportNotifications />;

  const contents: Partial<Record<keyof typeof pages, { title: string; description: string; values: string[] }>> = {
    assessments: { title: "تمرین‌ها و آزمون‌ها", description: "فعالیت‌های آموزشی دوره‌هایت را اینجا دنبال کن.", values: [] },
    growth: { title: "مسیر رشد", description: "نمایش خلاصهٔ فعالیت درسی با داده‌های آزمایشی.", values: ["ریاضی پایه هفتم · ۸ از ۱۲ درس", "علوم تجربی پایه هفتم · ۵ از ۱۰ درس", "یادآوری: این درصدها واقعی نیستند"] },
    "elite-club": {
      title: "باشگاه نخبگان",
      description: "چارچوب باشگاه بر رشد استعدادها، ارتباط و هم‌افزایی و نگاه نوآفرینانه بنا شده است. دسترسی عملیاتی هنوز فعال نشده است.",
      values: [
        "ثبت‌نام و ارزیابی عضویت هنوز فعال نیست.",
        "وضعیت عضویت یا مزایای ساختگی نمایش داده نمی‌شود.",
        "تعامل‌های باشگاه پس از تعریف دامنه و مجوزها فعال می‌شوند.",
      ],
    },
    profile: { title: "پروفایل کاربری", description: "اطلاعات حساب و مشخصات ثبت‌شده‌ات را مدیریت کن.", values: [] },
    services: { title: "مرکز خدمات", description: "درخواست‌های خدماتی در این دمو ثبت نمی‌شوند.", values: ["خدمات آموزشی", "راهنمای استفاده از دنا", "پشتیبانی فنی"] },
    notifications: { title: "اعلان‌ها", description: "این بخش در نسخهٔ فعلی پنل، اعلان‌های درخواست‌های پشتیبانی را نشان می‌دهد.", values: [] },
  };
  const content = contents[section];
  if (!content) return null;
  return <div className="space-y-6"><section className="rounded-[22px] bg-dena-lavender p-6"><h2 className="text-2xl font-extrabold text-dena-deep">{content.title}</h2><p className="mt-2 text-sm leading-7 text-dena-muted">{content.description}</p></section><div className="grid gap-4">{content.values.map((value, index) => <Card key={value} className="space-y-3"><p className="text-sm font-semibold text-dena-ink">{value}</p>{section === "assessments" && index === 0 && <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName("outline")}>شروع تمرین نمونه</Link>}</Card>)}</div></div>;
}

export default async function StudentDemoPage({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ filter?: string; tab?: string }> }) {
  const { section: path = [] } = await params;
  const { filter = "all", tab = "sessions" } = await searchParams;
  const pageKey = path.length ? path.join("/") : "home";
  const page = pages[path[0] === "elite-club" ? "elite-club" : path[0] || "home"];
  if (!page) notFound();

  const course = path[0] === "courses" ? demoCourses.find((item) => item.id === path[1]) : undefined;
  const isCoursePath = path[0] === "courses";
  if (isCoursePath && path.length > 1 && !course) notFound();

  let content: ReactNode;
  if (pageKey === "home") content = <Home />;
  else if (pageKey === "courses" && path.length === 1) content = <CourseList filter={filter} />;
  else if (isCoursePath && path.length === 2 && course) content = <CourseDetail course={course} />;
  else if (isCoursePath && path[2] === "lessons" && path.length === 4 && course) {
    const lessonNumber = Number(path[3]);
    if (!Number.isInteger(lessonNumber) || lessonNumber < 1) notFound();
    content = <LessonDetail course={course} lessonNumber={lessonNumber} tab={tab} />;
  } else if (isCoursePath && path[2] === "team" && path.length === 3 && course) content = <CourseTeam course={course} />;
  else if (isCoursePath && path[2] === "team" && path.length === 4 && course) content = <TeamMember course={course} roleId={path[3]} conversation={false} />;
  else if (isCoursePath && path[2] === "team" && path.length === 5 && path[4] === "conversation" && course) content = <TeamMember course={course} roleId={path[3]} conversation />;
  else if (path[0] === "assessments" && path.length === 1) content = <AssessmentsDemo filter={filter} />;
  else if (path[0] === "assessments" && path[1] === "math-7-practice" && path[2] === "start" && path.length === 3) content = <DemoPracticeCard />;
  else if (path[0] === "assessments" && path[1] === "math-7-practice" && path[2] === "start" && path.length === 4 && ["review","submit-confirm","leave-confirm"].includes(path[3])) content = <DemoPracticeCard state={path[3] as "review" | "submit-confirm" | "leave-confirm"} />;
  else if (path[0] === "assessments" && path[1] === "math-7-practice" && path[2] === "result" && path.length === 3) content = <DemoPracticeCard state="result" />;
  else if (path[0] === "assessments" && path[1] === "national" && path.length === 2) content = <DemoPracticeCard state="national" />;
  else if (path[0] === "assessments" && path.length === 2) content = <AssessmentsDemo detail={path[1]} />;
  else if (path[0] === "profile" && path[1] === "edit" && path.length === 2) content = <ProfileDemo edit />;
  else if (path[0] === "profile" && path[1] === "privacy" && path.length === 2) content = <StudentFlowDemo kind="privacy" />;
  else if (path[0] === "profile" && path[1] === "change-phone") content = <StudentFlowDemo kind="change-phone" path={path.slice(2)} />;
  else if (path[0] === "profile" && path[1] && path.length === 2) content = <div className="mx-auto max-w-3xl"><Card className="space-y-4 p-6"><Link href="/student-demo/profile" className="text-sm font-bold text-dena-brand">بازگشت به پروفایل ←</Link><h2 className="text-xl font-extrabold">{path[1]==="privacy"?"حریم خصوصی و داده‌ها":"تغییر شماره موبایل"}</h2><p className="text-sm leading-7 text-dena-muted">این بخش در نسخهٔ نمایشی فقط برای مرور صفحه است و تغییری در حساب واقعی ایجاد نمی‌کند.</p></Card></div>;
  else if (path[0] === "notifications") content = <StudentFlowDemo kind="notifications" path={path.slice(1)} />;
  else if (path[0] === "support") content = <StudentFlowDemo kind="support" path={path.slice(1)} />;
  else if (pageKey === "ai-tutor") content = <AiTutor />;
  else if (path[0] === "elite-club" && ["education","welfare","business"].includes(path[1] || "")) content = <StudentFlowDemo kind="club-category" path={path.slice(1)} />;
  else if (path[0] === "elite-club") content = <EliteClubDemo path={path.slice(1)} />;
  else if (path.length === 1) content = <GenericDemo section={pageKey as keyof typeof pages} />;
  else notFound();

  const title = path[0] === "profile" && path[1] === "privacy" ? "حریم خصوصی و داده‌ها" :
    path[0] === "profile" && path[1] === "change-phone" ? "تغییر شماره موبایل" :
    path[0] === "profile" && path[1] === "edit" ? "ویرایش اطلاعات" :
    path[0] === "support" ? path[1] === "new" ? "ثبت درخواست جدید پشتیبانی" : path[1] ? "درخواست پشتیبانی" : "پشتیبانی آنلاین دنا" :
    path[0] === "notifications" ? "اعلان‌ها" :
    path[0] === "elite-club" && path[1] === "education" ? "حمایت آموزشی" :
    path[0] === "elite-club" && path[1] === "welfare" ? "حمایت رفاهی" :
    path[0] === "elite-club" && path[1] === "business" ? "حمایت کسب‌وکار" :
    pageKey === "ai-tutor" ? "معلم هوشمند" :
    path[0] === "assessments" && path[1] === "math-7-practice" && path[2] === "start" ? "آزمون فصل سوم ریاضی" :
    isCoursePath && path[2] === "team" ? path[3] ? "تیم آموزشی دوره" : "تیم آموزشی دوره" :
    isCoursePath && path[2] === "lessons" ? "مشاهده جلسه آموزشی" :
    course ? course.title : page.title;

  return <StudentShell active={page.active} title={title} demo>{content}</StudentShell>;
}
