import Link from "next/link";
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

type StudentSection =
  | "home" | "aiTutor" | "courses" | "assessments" | "growth"
  | "elite" | "account" | "services" | "notifications";

type DemoCourse = {
  id: string;
  title: string;
  provider: string;
  done: number;
  total: number;
  lessons: string[];
};

const demoCourses: DemoCourse[] = [
  {
    id: "math-7",
    title: "ریاضی دهم",
    provider: "مؤسسه آموزشی البرز",
    done: 18,
    total: 24,
    lessons: ["دامنه تابع", "مفهوم تابع", "تابع و نمودار", "انواع نمودار"],
  },
  {
    id: "science-7",
    title: "فیزیک دهم",
    provider: "آموزشگاه نور دانش",
    done: 12,
    total: 20,
    lessons: ["نیرو و حرکت", "نور", "کار و انرژی", "گرما"],
  },
  { id: "chemistry-10", title: "شیمی دهم", provider: "مرکز علمی پژوهان", done: 8, total: 18, lessons: ["ساختار اتم", "جدول تناوبی", "پیوند شیمیایی"] },
  { id: "biology-10", title: "زیست‌شناسی دهم", provider: "دبیرستان فرزانگان", done: 16, total: 16, lessons: ["دنیای زنده", "گوارش و جذب مواد"] },
];

const teamRoles = [
  { id: "teacher", title: "مدرس", name: "خانم رضایی", detail: "آموزش و محتوای دوره" },
  { id: "supporter", title: "پشتیبان تحصیلی", name: "آقای محمدی", detail: "رفع اشکال و پیگیری یادگیری" },
  { id: "counselor", title: "مشاور", name: "خانم احمدی", detail: "راهنمایی در چارچوب خدمات مؤسسه" },
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
    { id: "math-7", title: "ریاضی دهم", institute: "مؤسسه آموزشی البرز", progress: 33, lesson: "جلسه ۸ از ۲۴", topic: "تابع و نمودار", last: "امروز" },
    { id: "science-7", title: "فیزیک دهم", institute: "مرکز آموزش نوین", progress: 27, lesson: "جلسه ۵ از ۱۸", topic: "نیرو و حرکت", last: "دیروز" },
    { id: "chemistry-10", title: "شیمی دهم", institute: "آکادمی علم", progress: 12, lesson: "جلسه ۲ از ۱۶", topic: "ساختار اتم", last: "۳ روز پیش" },
  ];
  const assessments = [
    { title: "آزمون فصل سوم ریاضی", course: "ریاضی دهم", status: "آماده انجام", color: "bg-dena-lavender text-dena-brand", href: "/student-demo/assessments/math-7-practice" },
    { title: "تمرین فیزیک - نور", course: "فیزیک دهم", status: "در انتظار", color: "bg-amber-50 text-amber-800", href: "/student-demo/assessments?filter=pending" },
    { title: "آزمون فصل دوم شیمی", course: "شیمی دهم", status: "انجام‌شده", color: "bg-emerald-50 text-emerald-700", href: "/student-demo/assessments?filter=completed" },
  ];
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-right">
        <h2 className="text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">سلام محمد 👋</h2>
        <p className="text-sm leading-7 text-dena-muted">آماده‌ای مسیر امروزت رو ادامه بدی؟</p>
      </header>

      <Card className="space-y-4 rounded-[20px] border-dena-border p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال آماده‌سازی</span>
          <div className="min-w-0 text-right">
            <h3 className="text-lg font-extrabold text-dena-deep">معلم هوشمند</h3>
            <p className="mt-1 text-sm leading-6 text-dena-muted">با داده‌های آموزشی دنا آغاز می‌شود و بعد با ویدئوهای مجاز دوره‌های تو، برای مسیر خودت رشد می‌کند.</p>
          </div>
        </div>
        <p className="border-t border-dena-border pt-3 text-xs leading-6 text-dena-muted">گفت‌وگو پس از آماده‌سازی و ارزیابی سرویس فعال می‌شود.</p>
        <Link href="/student-demo/ai-tutor" className={buttonClassName() + " flex w-full justify-center"}>آشنایی با معلم هوشمند</Link>
      </Card>

      <Card className="space-y-4 rounded-[20px] border-dena-border p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال یادگیری</span>
          <div className="min-w-0 text-right">
            <h3 className="text-lg font-extrabold text-dena-deep">ریاضی دهم</h3>
            <p className="mt-1 text-sm font-semibold text-dena-deep">تابع و نمودار</p>
            <p className="mt-1 text-xs text-dena-muted">مؤسسه آموزشی البرز</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-dena-muted">
          <span>۳۳٪ پیشرفت</span>
          <span>جلسه ۸ از ۲۴</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-dena-lavender">
          <div className="h-full w-[33%] rounded-full bg-dena-mint" />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-dena-muted">
          <span>آخرین فعالیت: امروز</span>
          <span>ادامه مسیر یادگیری</span>
        </div>
        <Link href="/student-demo/courses/math-7/lessons/3" className={buttonClassName() + " flex w-full justify-center"}>ادامه یادگیری</Link>
      </Card>

      <Card className="space-y-4 rounded-[20px] border-dena-border p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">آماده انجام</span>
          <h3 className="font-extrabold text-dena-deep">آزمون فصل سوم ریاضی</h3>
        </div>
        <p className="text-sm text-dena-muted">ریاضی دهم · زمان پیشنهادی: امروز</p>
        <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName() + " flex w-full justify-center"}>شروع آزمون</Link>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student-demo/courses" className="text-xs font-semibold text-dena-brand hover:underline">مشاهده همه دوره‌ها</Link>
          <h3 className="text-lg font-extrabold text-dena-deep">دوره‌های من</h3>
        </div>
        <div className="space-y-3">
          {courses.map(course => <Card key={course.id} className="space-y-3 rounded-[18px] p-4">
            <div className="flex items-start justify-between gap-3 text-right">
              <div className="min-w-0">
                <h4 className="font-extrabold text-dena-deep">{course.title}</h4>
                <p className="mt-1 text-xs text-dena-muted">{course.lesson} · {course.institute}</p>
              </div>
              <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">ادامه</span>
            </div>
            <div className="flex items-center justify-between text-xs text-dena-muted"><span>{course.progress}٪ پیشرفت</span><span>{course.last}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{ width: `${course.progress}%` }} /></div>
            <div className="flex items-center justify-between gap-2 text-xs"><Link href={`/student-demo/courses/${course.id}`} className="font-bold text-dena-brand">مشاهده دوره ←</Link><span className="truncate text-dena-muted">{course.topic}</span></div>
          </Card>)}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student-demo/assessments" className="text-xs font-semibold text-dena-brand hover:underline">مشاهده همه</Link>
          <h3 className="text-lg font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h3>
        </div>
        <div className="space-y-3">
          {assessments.map(item => <Link key={item.title} href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-dena-border bg-white p-3 hover:border-dena-brand">
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${item.color}`}>{item.status}</span>
            <span className="min-w-0 text-right"><span className="block text-sm font-semibold text-dena-deep">{item.title}</span><span className="mt-1 block text-xs text-dena-muted">{item.course}</span></span>
          </Link>)}
        </div>
      </section>

      <Card className="space-y-3 rounded-[20px] p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student-demo/growth" className="text-xs font-semibold text-dena-brand">مشاهده مسیر رشد</Link>
          <h3 className="font-extrabold text-dena-deep">مسیر رشد من</h3>
        </div>
        <p className="text-sm leading-7 text-dena-muted">این هفته: ۴ جلسه آموزشی تکمیل شد و ۲ تمرین انجام شد.</p>
        <div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full w-[68%] rounded-full bg-dena-mint" /></div>
        <p className="text-xs text-dena-muted">پیشرفت این هفته</p>
      </Card>

      <Card className="flex items-center justify-between gap-4 rounded-[20px] p-4">
        <Link href="/student-demo/elite-club" className="text-xs font-semibold text-dena-brand">مشاهده باشگاه</Link>
        <div className="text-right"><h3 className="font-extrabold text-dena-deep">باشگاه نخبگان</h3><p className="mt-1 text-sm text-dena-muted">فرصت‌ها و مسیرهای رشد بیشتر در دنا.</p></div>
      </Card>
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
    { ...demoCourses[0], title: "ریاضی دهم", provider: "مؤسسه آموزشی البرز", teacher: "استاد احمدی", done: 18, total: 24, topic: "تابع و نمودار" },
    { ...demoCourses[1], title: "فیزیک دهم", provider: "آموزشگاه نور دانش", teacher: "استاد محمدی", done: 12, total: 20, topic: "نیرو و حرکت" },
    { id: "chemistry-10", title: "شیمی دهم", provider: "مرکز علمی پژوهان", teacher: "استاد رضایی", done: 8, total: 18, lessons: ["ساختار اتم", "جدول تناوبی", "پیوند شیمیایی"], topic: "ساختار اتم" },
    { id: "biology-10", title: "زیست‌شناسی دهم", provider: "دبیرستان فرزانگان", teacher: "استاد کریمی", done: 16, total: 16, lessons: ["دنیای زنده", "گوارش و جذب مواد"], topic: "تکمیل دوره" },
  ];
  const visibleCatalog = catalog.filter(course => filter === "all" || (filter === "completed" ? course.done === course.total : course.done < course.total));
  return (
    <div className="space-y-5">
      <header className="space-y-2 text-right">
        <h2 className="text-2xl font-extrabold text-dena-deep">دوره‌های من</h2>
        <p className="text-sm leading-6 text-dena-muted">دوره‌های آموزشی و میزان پیشرفت یادگیری‌ات را دنبال کن.</p>
      </header>
      <nav aria-label="فیلتر دوره‌ها" className="flex flex-wrap justify-start gap-2">
        {[[ "all", "همه" ], [ "learning", "در حال یادگیری" ], [ "completed", "تکمیل‌شده" ]].map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/student-demo/courses" : `/student-demo/courses?filter=${key}`} aria-current={filter === key ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${filter === key ? "border-dena-brand bg-dena-brand text-white" : "border-dena-border bg-white text-dena-muted hover:border-dena-brand hover:text-dena-brand"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-3">
        {visibleCatalog.map(course => {
          const progress = Math.round(course.done / course.total * 100);
          const completed = progress === 100;
          return (
            <Card key={course.id} className="space-y-3 rounded-[20px] p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 text-right">
                  <h3 className="font-extrabold text-dena-deep">{course.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-dena-muted">{course.provider} · {course.teacher}</p>
                  <p className="mt-1 text-xs text-dena-muted">{course.done} از {course.total} جلسه</p>
                </div>
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-dena-lavender text-dena-brand">
                  <CourseGlyph courseId={course.id} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-dena-muted">
                <span>{progress}٪ پیشرفت</span>
                <span>{completed ? "دوره تکمیل شده" : `موضوع فعلی: ${course.topic}`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-dena-lavender">
                <div className="h-full rounded-full bg-dena-mint" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Link href={`/student-demo/courses/${course.id}`} className={buttonClassName(completed ? "outline" : undefined) + " min-h-10 px-4"}>
                  {completed ? "مشاهده دوره" : "ادامه یادگیری"}
                </Link>
                <span className="text-xs text-dena-muted">{completed ? "تکمیل‌شده" : "آخرین فعالیت: امروز"}</span>
              </div>
            </Card>
          );
        })}
      </div>
      {visibleCatalog.length === 0 && <Card className="p-8 text-center text-sm text-dena-muted">در این وضعیت دوره‌ای برای نمایش نیست.</Card>}
    </div>
  );
}

function CourseDetail({ course }: { course: DemoCourse }) {
  const progress = Math.round(course.done / course.total * 100);
  const currentLesson = course.id === "math-7" ? "تابع و نمودار" : course.lessons[Math.max(0, course.lessons.length - 1)];
  const lessonPath = course.id === "math-7" ? 3 : Math.max(1, course.lessons.length);
  return (
    <div className="space-y-4">
      <Card className="space-y-4 rounded-[22px] p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-right">
            <p className="text-xs font-bold text-dena-brand">{course.provider}</p>
            <h2 className="mt-2 text-xl font-extrabold text-dena-deep">{course.title}</h2>
            <p className="mt-1 text-sm text-dena-muted">موضوع فعلی: {currentLesson}</p>
          </div>
          <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال یادگیری</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-dena-muted">
          <span>{progress}٪ پیشرفت</span>
          <span>{course.done} از {course.total} جلسه</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-dena-lavender">
          <div className="h-full rounded-full bg-dena-mint" style={{ width: `${progress}%` }} />
        </div>
        <Link href={`/student-demo/courses/${course.id}/lessons/${lessonPath}`} className={buttonClassName() + " flex w-full justify-center"}>ادامه یادگیری</Link>
      </Card>

      <Card className="space-y-3 rounded-[20px] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال یادگیری</span>
          <h3 className="font-extrabold text-dena-deep">جلسه جاری</h3>
        </div>
        <div className="text-right">
          <p className="font-bold text-dena-deep">جلسه {course.id === "math-7" ? "۸" : course.done} — {currentLesson}</p>
          <p className="mt-1 text-xs text-dena-muted">مدرس: استاد احمدی</p>
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
                      <span className={`text-sm font-semibold ${selected ? "text-dena-brand" : "text-dena-deep"}`}>جلسه {session.number} — {session.title}</span>
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
                <div className="h-full w-[41%] rounded-full bg-dena-brand" />
                <span className="absolute left-[41%] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-white bg-dena-brand" />
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
    <div className="space-y-6">
      <Card className="space-y-4 rounded-[20px] border-dena-border p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full bg-dena-bg px-3 py-2 text-[13px] font-bold text-dena-brand">در حال آماده‌سازی</span>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-dena-deep">معلم هوشمند</h2>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-dena-muted">با داده‌های آموزشی دنا آغاز می‌شود و بعد با ویدئوهای مجاز دوره‌های تو، برای مسیر خودت رشد می‌کند.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dena-border pt-4">
          <p className="text-xs leading-6 text-dena-muted">گفت‌وگو پس از آماده‌سازی و ارزیابی سرویس فعال می‌شود.</p>
          <Link href="#demo-ai-growth" className={buttonClassName()}>آشنایی با معلم هوشمند</Link>
        </div>
      </Card>

      <Card className="space-y-4 rounded-[22px] p-6">
        <h3 className="font-extrabold text-dena-deep">نمونهٔ گفت‌وگو</h3>
        <p className="w-fit max-w-[90%] rounded-2xl bg-dena-bg p-4 text-sm leading-7">
          چطور عدد منفی را در عدد منفی ضرب کنم؟
        </p>
        <p className="mr-auto w-fit max-w-[90%] rounded-2xl bg-dena-lavender p-4 text-sm leading-7">
          در ضرب دو عدد منفی، حاصل مثبت می‌شود. برای نمونه، (−۳) × (−۲) = ۶.
        </p>
        <p className="border-t border-dena-border pt-3 text-xs leading-6 text-dena-muted">
          این گفت‌وگو نمونهٔ رابط است و در وضعیت فعلی پرسشی به مدل ارسال یا سابقه‌ای ذخیره نمی‌شود.
        </p>
      </Card>

      <section className="space-y-4">
        <SectionHeading id="demo-ai-growth" note="بر اساس وضعیت فعلی معلم دنا">
          معلم هوشمند چطور پاسخ می‌دهد و رشد می‌کند؟
        </SectionHeading>
        <ol className="grid gap-4 lg:grid-cols-3">
          {learningStages.map((stage) => (
            <li key={stage.number}>
              <Card className="h-full space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-dena-lavender text-sm font-extrabold text-dena-brand">
                    {stage.number}
                  </span>
                  <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-semibold text-dena-muted">
                    {stage.status}
                  </span>
                </div>
                <div>
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
  return <div className="space-y-6">
    <header className="space-y-2 text-right"><h2 className="text-2xl font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h2><p className="text-sm text-dena-muted">فعالیت‌های آموزشی دوره‌هایت را اینجا دنبال کن.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" className="rounded-xl border border-dena-border bg-white px-4 py-3 text-sm">همه دوره‌ها⌄</button>
      <nav aria-label="فیلتر فعالیت‌ها" className="flex flex-wrap gap-1 rounded-xl bg-dena-bg p-1">
        {[["completed","انجام‌شده"],["pending","در انتظار"],["ready","آماده انجام"],["all","همه"]].map(([key,label])=><Link key={key} href={key==="all"?"/student-demo/assessments":`/student-demo/assessments?filter=${key}`} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter===key?"bg-white text-dena-brand shadow-sm":"text-dena-muted"}`}>{label}</Link>)}
      </nav>
    </div>
    {filter==="all"&&<Card className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-dena-lavender/40 p-6"><div className="text-right"><p className="text-xs text-dena-muted">زمان پیشنهادی: امروز · دوره: ریاضی دهم</p><h3 className="mt-2 text-lg font-extrabold text-dena-deep">آزمون فصل سوم ریاضی</h3><span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">آماده انجام</span></div><Link href="/student-demo/assessments/math-7-practice" className={buttonClassName()}>شروع آزمون</Link></Card>}
    <div className="overflow-hidden rounded-[20px] border border-dena-border bg-white">{filtered.map((item,index)=><div key={item.id} className={`flex flex-wrap items-center justify-between gap-4 p-5 ${index?"border-t border-dena-border":""}`}><div className="flex flex-wrap items-center gap-4"><span className={`rounded-full px-3 py-2 text-xs font-bold ${item.status==="completed"?"bg-emerald-50 text-emerald-700":item.status==="pending"?"bg-amber-50 text-amber-800":"bg-dena-lavender text-dena-brand"}`}>{item.label}</span><span className="text-sm text-dena-muted">{item.course}</span><span className="font-bold text-dena-deep">{item.title}</span></div>{item.status==="pending"?<span className="text-xs text-dena-muted">{item.date}</span>:<Link href={`/student-demo/assessments/${item.id}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-dena-brand hover:bg-dena-lavender">{item.status==="completed"?"مشاهده نتیجه":"شروع آزمون"}</Link>}</div>)}</div>
    <p className="text-xs leading-6 text-dena-muted">فعالیت‌ها و وضعیت‌ها برای پیش‌نمایش هستند؛ نتیجهٔ واقعی ثبت نمی‌شود.</p>
  </div>;
}
function GrowthDemo() {
  const courses=[{name:"ریاضی دهم",progress:33,detail:"جلسه ۸ از ۲۴ · در حال پیشرفت"},{name:"فیزیک دهم",progress:27,detail:"جلسه ۵ از ۱۸ · در حال پیشرفت"},{name:"شیمی دهم",progress:12,detail:"جلسه ۲ از ۱۶ · شروع‌شده"}];
  const activity=[{when:"امروز",text:"جلسه ۷ ریاضی دهم تکمیل شد"},{when:"دیروز",text:"آزمون یادگیری تابع با موفقیت انجام شد"},{when:"۳ روز پیش",text:"مرور مجدد یک جلسه تکمیل شد"}];
  return <div>
    <div className="space-y-4 md:hidden">
      <header className="space-y-1 text-right"><h2 className="text-base font-extrabold text-dena-deep">مسیر رشد من</h2><p className="text-xs leading-6 text-dena-muted">پیشرفت یادگیری و قدم‌های بعدی‌ات را ببین.</p></header>
      <Card className="space-y-4 rounded-2xl border-dena-brand p-5">
        <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-dena-lavender px-2.5 py-1 text-[11px] font-bold text-dena-brand">پیشنهادی امروز</span><h3 className="text-[13px] font-semibold text-dena-muted">قدم بعدی شما</h3></div>
        <div className="space-y-1 text-right"><p className="text-lg font-extrabold text-dena-deep">ادامه جلسه ۸ — تابع و نمودار</p><p className="text-xs text-dena-muted">ریاضی دهم</p></div>
        <Link href="/student-demo/courses/math-7/lessons/3" className={buttonClassName()+" h-12 w-full"}>ادامه مسیر یادگیری</Link>
      </Card>
      <Card className="space-y-4 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2"><span className="rounded-full border border-dena-border bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-brand">ریاضی دهم ▼</span><h3 className="text-base font-extrabold text-dena-deep">روند رشد من</h3></div>
        <div className="space-y-3 rounded-xl border border-dena-border bg-dena-bg p-3">
          <p className="text-right text-[11px] font-semibold text-dena-muted">روند عملکرد آموزشی</p>
          <div className="relative h-[200px] overflow-hidden rounded-xl border border-dena-border bg-dena-bg">
            <svg viewBox="0 0 300 200" role="img" aria-label="روند نمونهٔ عملکرد آموزشی از ۴۲ به ۶۸" className="h-full w-full">
              {[35,75,115,155].map(y=><line key={y} x1="4" y1={y} x2="296" y2={y} stroke="#e5e1ed" strokeWidth="1"/>)}
              <polyline points="10,150 57,120 104,95 151,125 198,75 245,98 290,58" fill="none" stroke="#5b4ce2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              {[[10,150],[57,120],[104,95],[151,125],[198,75],[245,98],[290,58]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill={i===3?"#f0a34a":"#42cfa7"} stroke="white" strokeWidth="2"/>)}
              <text x="7" y="46" fontSize="10" fill="#42cfa7">مرور درس تکمیل شد</text><text x="130" y="145" fontSize="10" fill="#c46500">نیاز به مرور</text>
              <text x="10" y="188" fontSize="9" fill="#5b4ce2">شروع دوره</text><text x="64" y="188" fontSize="9" fill="#756f83">ارزیابی</text><text x="120" y="188" fontSize="9" fill="#756f83">فصل اول</text><text x="175" y="188" fontSize="9" fill="#756f83">فصل دوم</text><text x="224" y="188" fontSize="9" fill="#756f83">مرور مجدد</text><text x="270" y="188" fontSize="9" fill="#5b4ce2">اکنون</text>
            </svg>
          </div>
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-dena-border rounded-xl border border-dena-border bg-white px-2 py-3 text-right">
            {[["شروع دوره","۴۲","text-dena-deep"],["تغییر","+۲۶","text-emerald-600"],["اکنون","۶۸","text-dena-brand"]].map(([label,value,tone])=><div key={label} className="px-2"><p className="text-[11px] text-dena-muted">{label}</p><p className={`mt-1 text-base font-extrabold ${tone}`}>{value}</p></div>)}
          </div>
        </div>
        <div className="rounded-xl border border-dena-border bg-white p-3 text-right">
          <p className="text-xs text-dena-muted">دوره‌های من</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-dena-muted">جلسه ۸ از ۲۴ · ۳۳٪ پیشرفت</span><span className="text-sm font-extrabold text-dena-deep">ریاضی دهم</span></div>
          <div className="mt-2 h-2 rounded-full bg-dena-lavender"><div className="h-2 w-[33%] rounded-full bg-dena-mint"/></div>
          <Link href="/student-demo/courses/math-7" className="mt-3 inline-block text-xs font-bold text-dena-brand">ادامه ←</Link>
        </div>
      </Card>
      <Card className="space-y-4 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3"><Link href="/student-demo/courses/math-7" className="text-xs font-bold text-dena-brand">مشاهده دوره ←</Link><h3 className="font-extrabold text-dena-deep">مسیر یادگیری ریاضی</h3></div>
        <ol className="space-y-2">{[{title:"دامنه تابع",session:"جلسه ۶",done:true},{title:"مفهوم تابع",session:"جلسه ۷",done:true},{title:"تابع و نمودار",session:"جلسه ۸",active:true},{title:"انواع نمودار",session:"جلسه ۹"}].map((item,i)=><li key={item.title} className="flex items-center gap-3 rounded-xl border border-dena-border p-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${item.done?"bg-emerald-50 text-emerald-700":item.active?"bg-dena-lavender text-dena-brand":"bg-dena-bg text-dena-muted"}`}>{item.done?"✓":i+6}</span><span className="flex-1 text-right"><span className="block text-sm font-semibold text-dena-deep">{item.title}</span><span className="text-xs text-dena-muted">{item.session}</span></span></li>)}</ol>
      </Card>
      <Card className="space-y-3 rounded-2xl p-4"><h3 className="text-right font-extrabold text-dena-deep">دستاوردهای اخیر</h3>{activity.map(a=><div key={a.text} className="flex justify-between gap-3 border-t border-dena-border pt-3"><p className="text-right text-sm">{a.text}</p><span className="shrink-0 text-xs text-dena-muted">{a.when}</span></div>)}</Card>
      <p className="text-xs leading-6 text-dena-muted">اعداد و فعالیت‌ها نمونه هستند و به حساب واقعی متصل نیستند.</p>
    </div>
    <div className="hidden space-y-6 md:block">
      <header className="space-y-2 text-right"><h2 className="text-2xl font-extrabold text-dena-deep">مسیر رشد من</h2><p className="text-sm text-dena-muted">پیشرفت یادگیری و قدم‌های بعدی‌ات را در یک مسیر ببین.</p></header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5 p-5 md:p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">پیشنهادی امروز</span><h3 className="font-extrabold text-dena-deep">قدم بعدی یادگیری</h3></div><div className="text-right"><p className="text-lg font-extrabold text-dena-deep">ادامه جلسه ۸ — تابع و نمودار</p><p className="mt-2 text-sm text-dena-muted">دوره مرتبط: ریاضی دهم</p></div><Link href="/student-demo/courses/math-7/lessons/3" className={buttonClassName()}>ادامه یادگیری</Link></Card>
        <Card className="space-y-5 p-5 md:p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">در حال پیشرفت</span><h3 className="font-extrabold text-dena-deep">وضعیت فعلی شما</h3></div><div className="space-y-2 text-right"><p className="text-lg font-extrabold">ریاضی دهم</p><p className="text-sm text-dena-muted">مرحله فعلی: تابع و نمودار</p><p className="text-sm text-dena-muted">جلسه فعال: جلسه ۸ از ۲۴</p></div></Card>
      </div>
      <Card className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-lg border border-dena-border px-3 py-2 text-sm">ریاضی دهم⌄</span><h3 className="font-extrabold text-dena-deep">روند رشد من</h3></div>
        <div className="overflow-x-auto"><svg viewBox="0 0 700 250" role="img" aria-label="روند نمونهٔ عملکرد آموزشی از امتیاز ۴۲ به ۶۸" className="min-w-[560px] w-full">
          {[50,100,150,200].map(y=><line key={y} x1="28" y1={y} x2="680" y2={y} className="stroke-dena-border" strokeDasharray="4 6"/>)}
          <polyline points="40,177 170,105 300,125 430,75 560,98 660,58" fill="none" stroke="currentColor" className="text-dena-brand" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          {[[40,177],[170,105],[300,125],[430,75],[560,98],[660,58]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" className="fill-dena-mint stroke-white" strokeWidth="3"/>)}
          <text x="40" y="235" className="fill-dena-muted text-[11px]">شروع دوره</text><text x="190" y="235" className="fill-dena-muted text-[11px]">مرور مجدد</text><text x="365" y="235" className="fill-dena-muted text-[11px]">فصل دوم</text><text x="600" y="235" className="fill-dena-muted text-[11px]">اکنون</text>
        </svg></div>
        <div className="grid gap-3 rounded-xl bg-dena-bg p-4 sm:grid-cols-3 text-right">{[["شروع دوره","۴۲"],["تغییر","+۲۶"],["اکنون","۶۸"]].map(([a,b])=><div key={a}><p className="text-xs text-dena-muted">{a}</p><p className="mt-1 text-xl font-extrabold text-dena-brand">{b}</p></div>)}</div>
        <p className="text-xs leading-6 text-dena-muted">اعداد نمونه‌اند و برای نمایش روند هستند؛ نمرهٔ رسمی یا اثبات یادگیری نیستند.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-5 p-5 md:p-6"><div className="flex items-center justify-between"><Link href="/student-demo/courses/math-7" className="text-sm font-bold text-dena-brand">مشاهده دوره ←</Link><h3 className="font-extrabold text-dena-deep">مسیر یادگیری دوره</h3></div><ol className="space-y-3">{["دامنه تابع · جلسه ۶","مفهوم تابع · جلسه ۷","تابع و نمودار · جلسه ۸","آزمون یادگیری فصل سوم · جلسه آزمون","انواع نمودار · جلسه ۹"].map((x,i)=><li key={x} className="flex items-center gap-3 rounded-xl border border-dena-border p-3"><span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${i<2?"bg-emerald-50 text-emerald-700":i===2?"bg-dena-lavender text-dena-brand":"bg-dena-bg text-dena-muted"}`}>{i<2?"✓":i+6}</span><span className="text-sm font-semibold">{x}</span></li>)}</ol></Card>
        <div className="space-y-4"><Card className="space-y-4 p-5"><h3 className="font-extrabold text-dena-deep">دوره‌های در حال رشد</h3>{courses.map(c=><div key={c.name} className="space-y-2 border-t border-dena-border pt-3"><div className="flex justify-between gap-2"><span className="text-xs text-dena-muted">{c.progress}٪ پیشرفت</span><span className="text-sm font-bold">{c.name}</span></div><p className="text-xs text-dena-muted">{c.detail}</p><div className="h-2 rounded-full bg-dena-lavender"><div className="h-2 rounded-full bg-dena-mint" style={{width:`${c.progress}%`}}/></div></div>)}</Card>
        <Card className="space-y-3 p-5"><h3 className="font-extrabold text-dena-deep">دستاوردهای اخیر</h3>{activity.map(a=><div key={a.text} className="flex justify-between gap-3 border-t border-dena-border pt-3"><p className="text-sm">{a.text}</p><span className="shrink-0 text-xs text-dena-muted">{a.when}</span></div>)}</Card></div>
      </div>
      <p className="text-xs leading-6 text-dena-muted">تمام داده‌های این صفحه برای پیش‌نمایش رابط هستند.</p>
    </div>
  </div>;
}

function ProfileDemo({ edit = false }: { edit?: boolean }) {
  if(edit) return <div>
    <div className="mx-auto max-w-3xl space-y-4 md:hidden">
      <header className="flex items-center justify-between gap-3"><Link href="/student-demo/profile" className="text-sm font-semibold text-dena-brand">انصراف</Link><h2 className="text-base font-extrabold text-dena-deep">ویرایش اطلاعات</h2></header>
      <Card className="space-y-4 rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2 text-right text-xs font-semibold text-dena-muted"><span>نام خانوادگی</span><input readOnly value="علوی" className="w-full rounded-xl border border-dena-border bg-white px-3 py-3 text-sm font-medium text-dena-deep outline-none"/></label>
          <label className="space-y-2 text-right text-xs font-semibold text-dena-muted"><span>نام</span><input readOnly value="محمد" className="w-full rounded-xl border border-dena-border bg-white px-3 py-3 text-sm font-medium text-dena-deep outline-none"/></label>
        </div>
      </Card>
      <Card className="space-y-4 rounded-2xl p-4">
        <div className="text-right"><h3 className="font-extrabold text-dena-deep">اطلاعات سیستمی (غیرقابل ویرایش)</h3></div>
        <div className="space-y-3 border-t border-dena-border pt-3">
          <div className="flex items-center justify-between gap-4 text-right"><span className="text-sm font-semibold text-dena-deep">دهم تجربی</span><span className="text-xs text-dena-muted">پایه و رشته</span></div>
          <div className="flex items-center justify-between gap-4 border-t border-dena-border pt-3 text-right"><span dir="ltr" className="text-sm font-semibold text-dena-deep">۰۹۱۲••••••••</span><span className="text-xs text-dena-muted">شماره ورود</span></div>
        </div>
      </Card>
      <div className="space-y-3">
        <button type="button" disabled className={buttonClassName()+" h-12 w-full opacity-60"}>ذخیره تغییرات</button>
        <Link href="/student-demo/profile" className="flex h-11 w-full items-center justify-center rounded-xl border border-dena-border bg-white text-sm font-semibold text-dena-muted">انصراف</Link>
        <p className="text-center text-xs leading-6 text-dena-muted">این صفحه پیش‌نمایش است؛ تغییرات در حساب واقعی ذخیره نمی‌شوند.</p>
      </div>
    </div>
    <div className="mx-auto hidden max-w-3xl md:block"><Card className="space-y-5 rounded-[22px] p-6 md:p-8"><Link href="/student-demo/profile" className="text-sm font-bold text-dena-brand">بازگشت به پروفایل ←</Link><h2 className="text-2xl font-extrabold text-dena-deep">ویرایش پروفایل</h2><label className="block space-y-2 text-sm"><span>نام و نام خانوادگی</span><input readOnly value="محمد علوی" className="w-full rounded-xl border border-dena-border bg-dena-bg px-4 py-3"/></label><p className="text-xs text-dena-muted">در پیش‌نمایش امکان ذخیرهٔ اطلاعات واقعی وجود ندارد.</p><button type="button" disabled className={buttonClassName()+" opacity-60"}>ذخیرهٔ تغییرات</button></Card></div>
  </div>;
  return <div>
    <div className="space-y-4 md:hidden">
      <header className="text-right"><h2 className="text-base font-extrabold text-dena-deep">پروفایل کاربری</h2></header>
      <Card className="flex items-center justify-between gap-3 rounded-2xl p-4">
        <Link href="/student-demo/profile/edit" className="shrink-0 rounded-xl border border-dena-border px-3 py-2 text-sm font-bold text-dena-brand">ویرایش</Link>
        <div className="flex min-w-0 items-center gap-3 text-right">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-dena-lavender text-lg font-extrabold text-dena-brand" aria-hidden="true">م</div>
          <div><h3 className="font-extrabold text-dena-deep">محمد علوی</h3><p className="mt-1 text-xs text-dena-muted">پایه دهم تجربی</p></div>
        </div>
      </Card>
      <Card className="space-y-4 rounded-2xl p-4">
        <h3 className="text-right font-extrabold text-dena-deep">اطلاعات شخصی</h3>
        <div className="space-y-3 border-t border-dena-border pt-3 text-right">
          <div><p className="text-xs text-dena-muted">نام و نام خانوادگی</p><p className="mt-1 text-sm font-semibold text-dena-deep">محمد علوی</p></div>
          <div className="flex items-center justify-between gap-3 border-t border-dena-border pt-3">
            <Link href="/student-demo/profile/change-phone" className="shrink-0 text-sm font-semibold text-dena-brand">تغییر شماره</Link>
            <div><p className="text-xs text-dena-muted">شماره ورود</p><p dir="ltr" className="mt-1 text-sm font-semibold text-dena-deep">۰۹۱۲••••••••</p></div>
          </div>
          <p className="text-xs leading-6 text-dena-muted">تغییر شماره موبایل نیاز به تأیید شماره جدید دارد</p>
        </div>
      </Card>
      <Card className="space-y-4 rounded-2xl p-4">
        <h3 className="text-right font-extrabold text-dena-deep">اطلاعات تحصیلی</h3>
        <div className="grid grid-cols-2 gap-3 border-t border-dena-border pt-3 text-right">
          <div><p className="text-xs text-dena-muted">رشته</p><p className="mt-1 text-sm font-semibold text-dena-deep">تجربی</p></div>
          <div><p className="text-xs text-dena-muted">پایه</p><p className="mt-1 text-sm font-semibold text-dena-deep">دهم</p></div>
        </div>
      </Card>
      <Link href="/student-demo/profile/privacy" className="flex items-center justify-between rounded-2xl border border-dena-border bg-white p-4 text-right">
        <span className="text-lg text-dena-muted" aria-hidden="true">‹</span><span className="text-sm font-semibold text-dena-deep">حریم خصوصی و داده‌ها</span>
      </Link>
      <button type="button" disabled className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-600 opacity-80">خروج از حساب کاربری</button>
      <p className="text-xs leading-6 text-dena-muted">اطلاعات نمایشی است و به حساب دانش‌آموز متصل نیست.</p>
    </div>
    <div className="hidden space-y-5 md:block">
      <header className="text-right"><h2 className="text-2xl font-extrabold text-dena-deep">پروفایل کاربری</h2><p className="mt-2 text-sm text-dena-muted">اطلاعات حساب و مشخصات ثبت‌شده‌ات را مدیریت کن.</p></header>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-4 p-5"><h3 className="font-extrabold text-dena-deep">محمد علوی</h3><p className="text-sm text-dena-muted">پایه دهم تجربی</p></Card>
          <Card className="space-y-3 p-5"><h3 className="font-extrabold text-dena-deep">حریم خصوصی و داده‌ها</h3><p className="text-sm leading-7 text-dena-muted">مدیریت اطلاعات خصوصی و داده‌های مربوط به حساب شما بر اساس سیاست‌های دنا.</p><Link href="/student-demo/profile/privacy" className="inline-flex text-sm font-bold text-dena-brand">مشاهده تنظیمات حریم خصوصی ←</Link></Card>
        </div>
        <div className="space-y-4">
          <Card className="space-y-5 p-5"><div className="flex items-center justify-between gap-3"><Link href="/student-demo/profile/edit" className={buttonClassName("outline")}>ویرایش اطلاعات</Link><h3 className="font-extrabold text-dena-deep">اطلاعات شخصی</h3></div><div className="border-t border-dena-border pt-4 text-right"><p className="text-xs text-dena-muted">نام و نام خانوادگی</p><p className="mt-1 font-semibold">محمد علوی</p></div><div className="flex items-center justify-between gap-4 border-t border-dena-border pt-4"><Link href="/student-demo/profile/change-phone" className="text-sm font-semibold text-dena-brand">تغییر شماره موبایل</Link><div className="text-right"><p className="text-xs text-dena-muted">شماره ورود به حساب</p><p className="mt-1 font-semibold">۰۹۱۲••••••••</p></div></div><p className="text-xs text-dena-muted">تغییر شماره موبایل نیاز به تأیید شماره جدید دارد.</p></Card>
          <Card className="space-y-4 p-5"><h3 className="font-extrabold text-dena-deep">اطلاعات تحصیلی</h3><div className="flex justify-start gap-12 border-t border-dena-border pt-4 text-right"><div><p className="text-xs text-dena-muted">رشته تحصیلی</p><p className="mt-1 font-semibold">علوم تجربی</p></div><div><p className="text-xs text-dena-muted">پایه تحصیلی</p><p className="mt-1 font-semibold">پایه دهم</p></div></div></Card>
        </div>
      </div>
      <p className="text-xs text-dena-muted">اطلاعات نمایشی است و به حساب دانش‌آموز متصل نیست.</p>
    </div>
  </div>;
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
