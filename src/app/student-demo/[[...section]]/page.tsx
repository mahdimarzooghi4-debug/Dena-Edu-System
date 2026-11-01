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
  notifications: { title: "اعلان‌ها", active: "notifications" },
};

function DemoNotice() {
  return (
    <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      حالت نمایش اپ دانش‌آموز · داده‌ها نمونه‌اند و هیچ حساب یا پروندهٔ واقعی متصل نیست.
    </div>
  );
}

function Home() {
  const courses = [
    { id: "math-7", title: "ریاضی دهم", institute: "مؤسسه آموزشی البرز", progress: 33, lesson: "جلسه ۸ از ۲۴", topic: "تابع و نمودار", last: "امروز" },
    { id: "science-7", title: "فیزیک دهم", institute: "مرکز آموزش نوین", progress: 27, lesson: "جلسه ۵ از ۱۸", topic: "فیزیک ۱", last: "دیروز" },
    { id: "chemistry-10", title: "شیمی دهم", institute: "آکادمی علم", progress: 12, lesson: "جلسه ۲ از ۱۶", topic: "ساختار اتم", last: "۳ روز پیش" },
  ];
  const assessments = [
    { title: "آزمون فصل سوم ریاضی", course: "ریاضی دهم", status: "آماده انجام", color: "bg-dena-lavender text-dena-brand", href: "/student-demo/assessments/math-7-practice" },
    { title: "تمرین فیزیک - نور", course: "فیزیک دهم", status: "در انتظار", color: "bg-amber-50 text-amber-800", href: "/student-demo/assessments?filter=pending" },
    { title: "آزمون فصل دوم شیمی", course: "شیمی دهم", status: "انجام‌شده", color: "bg-emerald-50 text-emerald-700", href: "/student-demo/assessments?filter=completed" },
  ];
  return (
    <div className="space-y-7">
      <header className="space-y-1 text-right">
        <h2 className="text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">سلام محمد 👋</h2>
        <p className="text-sm leading-7 text-dena-muted">آماده‌ای مسیر امروزت رو ادامه بدی؟</p>
      </header>

      <Card className="space-y-4 rounded-[22px] border-dena-border p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">در حال آماده‌سازی</span>
          <div className="text-right">
            <h3 className="text-lg font-extrabold text-dena-deep">معلم هوشمند</h3>
            <p className="mt-1 text-sm text-dena-muted">با داده‌های آموزشی دنا آغاز می‌شود و بعد با ویدئوهای مجاز دوره‌های تو، برای مسیر خودت رشد می‌کند.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dena-border pt-4">
          <p className="max-w-3xl text-xs leading-6 text-dena-muted">گفت‌وگو پس از آماده‌سازی و ارزیابی سرویس فعال می‌شود.</p>
          <Link href="/student-demo/ai-tutor" className={buttonClassName()}>رفتن به معلم هوشمند</Link>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5 rounded-[20px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">پیشنهادی امروز</span>
            <h3 className="font-extrabold text-dena-deep">قدم بعدی یادگیری</h3>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-lg font-extrabold text-dena-deep">ادامه جلسه ۸ — تابع و نمودار</p>
            <p className="text-sm text-dena-muted">دوره مرتبط: ریاضی دهم · مؤسسه آموزشی البرز</p>
            <p className="text-xs text-dena-muted">آخرین فعالیت: امروز</p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-dena-muted"><span>۳۳٪ پیشرفت</span><span>جلسه ۸ از ۲۴</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{ width: "33%" }} /></div>
          </div>
          <Link href="/student-demo/courses/math-7/lessons/3" className={buttonClassName()}>ادامه یادگیری</Link>
        </Card>

        <Card className="space-y-5 rounded-[20px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">آماده انجام</span>
            <h3 className="font-extrabold text-dena-deep">آزمون فصل سوم ریاضی</h3>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-sm font-semibold text-dena-deep">دوره مرتبط: ریاضی دهم</p>
            <p className="text-sm text-dena-muted">زمان پیشنهادی: امروز</p>
          </div>
          <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName()}>شروع آزمون</Link>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student-demo/courses" className="text-sm font-semibold text-dena-brand hover:underline">مشاهده همه دوره‌ها ←</Link>
          <h3 className="text-lg font-extrabold text-dena-deep">دوره‌های من</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {courses.map(course => <Card key={course.id} className="space-y-4 rounded-[18px] p-4">
            <div className="flex items-start justify-between gap-3 text-right"><div><h4 className="font-extrabold text-dena-deep">{course.title}</h4><p className="mt-1 text-xs text-dena-muted">{course.lesson}</p></div><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-dena-lavender text-sm font-bold text-dena-brand">{course.progress}٪</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{ width: `${course.progress}%` }} /></div>
            <div className="flex items-center justify-between gap-2 text-xs"><Link href={`/student-demo/courses/${course.id}`} className="font-bold text-dena-brand">ادامه ←</Link><span className="truncate text-dena-muted">{course.institute}</span></div>
            <p className="text-xs text-dena-muted">{course.topic} · آخرین فعالیت: {course.last}</p>
          </Card>)}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 rounded-[20px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/student-demo/assessments" className="text-sm font-semibold text-dena-brand hover:underline">مشاهده همه تمرین‌ها و آزمون‌ها ←</Link>
            <h3 className="font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h3>
          </div>
          <div className="space-y-3">
            {assessments.map(item => <Link key={item.title} href={item.href} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dena-border p-3 hover:border-dena-brand">
              <span className="text-sm font-semibold text-dena-deep">{item.title}</span>
              <span className="flex items-center gap-2"><span className="text-xs text-dena-muted">{item.course}</span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${item.color}`}>{item.status}</span></span>
            </Link>)}
          </div>
        </Card>
        <Card className="space-y-4 rounded-[20px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/student-demo/growth" className="text-sm font-semibold text-dena-brand hover:underline">مشاهده مسیر رشد ←</Link>
            <h3 className="font-extrabold text-dena-deep">مسیر رشد من</h3>
          </div>
          <div className="rounded-xl bg-dena-bg p-4 text-right">
            <p className="font-semibold text-dena-deep">این هفته: ۴ جلسه آموزشی تکمیل شد / ۲ تمرین انجام شد</p>
            <p className="mt-2 text-sm leading-6 text-dena-muted">با ادامه مسیر یادگیری، پیشرفتت به‌صورت ساده نمایش داده می‌شود.</p>
          </div>
          <div className="flex items-center justify-between text-sm"><span className="font-bold text-dena-brand">۴ جلسه</span><span className="text-dena-muted">پیشرفت این هفته</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{ width: "68%" }} /></div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-5">
        <Link href="/student-demo/elite-club" className="text-sm font-semibold text-dena-brand hover:underline">مشاهده باشگاه ←</Link>
        <div className="text-right"><h3 className="font-extrabold text-dena-deep">باشگاه نخبگان</h3><p className="mt-1 text-sm text-dena-muted">با ادامه مسیر یادگیری، وضعیت عضویتت را دنبال کن.</p></div>
      </Card>
      <p className="text-xs leading-6 text-dena-muted">اطلاعات داشبورد نمونه است و از حساب واقعی دریافت نشده است.</p>
    </div>
  );
}

function CourseList({ filter = "all" }: { filter?: string }) {
  const catalog = [
    { ...demoCourses[0], title: "ریاضی دهم", provider: "مؤسسه آموزشی البرز", teacher: "استاد احمدی", done: 18, total: 24, topic: "تابع و نمودار" },
    { ...demoCourses[1], title: "فیزیک دهم", provider: "آموزشگاه نور دانش", teacher: "استاد محمدی", done: 12, total: 20, topic: "نیرو و حرکت" },
    { id: "chemistry-10", title: "شیمی دهم", provider: "مرکز علمی پژوهان", teacher: "استاد رضایی", done: 8, total: 18, lessons: ["ساختار اتم", "جدول تناوبی", "پیوند شیمیایی"], topic: "ساختار اتم" },
    { id: "biology-10", title: "زیست‌شناسی دهم", provider: "دبیرستان فرزانگان", teacher: "استاد کریمی", done: 16, total: 16, lessons: ["دنیای زنده", "گوارش و جذب مواد"], topic: "تکمیل دوره" },
  ];
  const visibleCatalog=catalog.filter(course=>filter==="all"||(filter==="completed"?course.done===course.total:course.done<course.total));
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-right">
        <h2 className="text-2xl font-extrabold text-dena-deep">دوره‌های من</h2>
        <p className="text-sm text-dena-muted">دوره‌های آموزشی و میزان پیشرفت یادگیری‌ات را دنبال کن.</p>
      </header>
      <nav aria-label="فیلتر دوره‌ها" className="flex flex-wrap justify-start gap-2 border-b border-dena-border">
        {[["all","همه"],["learning","در حال یادگیری"],["completed","تکمیل‌شده"]].map(([key,label])=><a key={key} href={key==="all"?"/student-demo/courses":`/student-demo/courses?filter=${key}`} aria-current={filter===key?"page":undefined} className={`rounded-t-lg px-4 py-3 text-sm font-semibold ${filter===key?"bg-dena-lavender text-dena-brand":"text-dena-muted hover:bg-dena-lavender hover:text-dena-brand"}`}>{label}</a>)}
      </nav>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleCatalog.map((course) => {
          const progress=Math.round(course.done/course.total*100);
          const completed=progress===100;
          return <Card key={course.id} className="space-y-4 rounded-[20px] p-5 md:p-6">
            <div className="grid h-24 place-items-center rounded-xl bg-dena-lavender text-4xl text-dena-brand" aria-hidden="true">{course.title.includes("ریاضی")?"∑":course.title.includes("فیزیک")?"⚛":course.title.includes("شیمی")?"⚗":"❧"}</div>
            <div className="space-y-2 text-right"><h3 className="font-extrabold text-dena-deep">{course.title}</h3><p className="text-sm text-dena-muted">مؤسسه: {course.provider}</p><p className="text-sm text-dena-muted">مدرس: {course.teacher}</p></div>
            <div className="space-y-2"><div className="flex justify-between text-xs text-dena-muted"><span>{progress}٪ پیشرفت</span><span>{completed?course.total+" جلسه":`جلسه ${course.done} از ${course.total}`}</span></div><div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{width:`${progress}%`}}/></div></div>
            {!completed&&<div className="text-right"><p className="text-xs text-dena-muted">موضوع فعلی</p><p className="text-sm font-semibold text-dena-deep">{course.topic}</p></div>}
            <div className="flex justify-start"><Link href={`/student-demo/courses/${course.id}`} className={completed?buttonClassName("outline"):buttonClassName()}>{completed?"مشاهده دوره":"ادامه یادگیری"}</Link></div>
          </Card>;
        })}
      </div>
      {visibleCatalog.length===0&&<Card className="p-8 text-center text-sm text-dena-muted">در این وضعیت دوره‌ای برای نمایش نیست.</Card>}
      <p className="text-xs leading-6 text-dena-muted">اطلاعات این صفحه نمونهٔ نمایشی است و از پروندهٔ واقعی دریافت نشده است.</p>
    </div>
  );
}

function CourseDetail({ course }: { course: DemoCourse }) {
  return (
    <div className="space-y-6">
      <Link href="/student-demo/courses" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به دوره‌های من</Link>
      <Card className="space-y-5 rounded-[22px] p-6 md:p-8">
        <div><p className="text-sm font-bold text-dena-brand">{course.provider}</p><h2 className="mt-2 text-2xl font-extrabold text-dena-deep">{course.title}</h2><p className="mt-2 text-sm text-dena-muted">صفحهٔ جزئیات نمونه · {course.done} از {course.total} درس انجام‌شده</p></div>
        <Link href={`/student-demo/courses/${course.id}/team`} className={buttonClassName("outline")}>تیم آموزشی دوره</Link>
      </Card>
      <section className="space-y-4">
        <SectionHeading id="demo-lessons" note="درس‌ها برای نمایش ساخته شده‌اند">فهرست درس‌ها</SectionHeading>
        <ol className="space-y-3">
          {course.lessons.map((lesson, index) => (
            <li key={lesson}><Link href={`/student-demo/courses/${course.id}/lessons/${index + 1}`} className="flex items-center justify-between gap-4 rounded-2xl border border-dena-border bg-white p-4 hover:border-dena-brand"><span><span className="text-xs text-dena-muted">درس {index + 1}</span><span className="mt-1 block font-bold text-dena-ink">{lesson}</span></span><span className="text-sm font-bold text-dena-brand">مشاهده ←</span></Link></li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function LessonDetail({ course, lessonNumber }: { course: DemoCourse; lessonNumber: number }) {
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

  return (
    <div className="space-y-5">
      <Link href={`/student-demo/courses/${course.id}`} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به دوره</Link>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-dena-border bg-white p-5">
          <h2 className="mb-4 text-right text-base font-extrabold text-dena-deep">محتوای این دوره</h2>
          <ol className="space-y-2.5">
            {courseSessions.map((session) => {
              const selected = session.number === currentSessionNumber;
              const completed = session.state === "completed";
              return (
                <li key={session.number}>
                  <Link
                    href={`/student-demo/courses/${course.id}/lessons/${course.id === "math-7" ? session.number - 5 : session.number}`}
                    aria-current={selected ? "page" : undefined}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-right transition-colors ${selected ? "border-[1.5px] border-dena-brand bg-dena-lavender/50" : "border-dena-border bg-white hover:border-dena-brand"}`}
                  >
                    <span className={`shrink-0 text-xs font-semibold ${selected ? "text-dena-brand" : completed ? "text-emerald-700" : "text-dena-muted"}`}>
                      {selected ? "در حال یادگیری" : completed ? "تکمیل‌شده" : "شروع‌نشده"}
                    </span>
                    <span className={`text-sm font-semibold ${selected ? "text-dena-brand" : "text-dena-deep"}`}>جلسه {session.number} — {session.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="min-w-0 space-y-5">
          <section aria-label="پخش ویدئوی آموزشی" className="overflow-hidden rounded-2xl bg-[#131124] text-white">
            <div className="relative grid min-h-[260px] place-items-center overflow-hidden bg-[#131124] md:h-[400px]">
              <div aria-hidden="true" className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, transparent 49.8%, #aaa 50%, transparent 50.2%), linear-gradient(to bottom, transparent 49.8%, #aaa 50%, transparent 50.2%)" }} />
              <svg aria-hidden="true" viewBox="0 0 600 220" className="absolute inset-0 m-auto h-[70%] w-[82%] opacity-25">
                <polyline points="0,170 100,125 195,145 290,85 390,105 500,45 600,62" fill="none" stroke="#d4d0ef" strokeWidth="2" />
              </svg>
              <span className="absolute right-5 top-5 rounded-full bg-black/70 px-4 py-2 text-xs text-white">ادامه از ۱۸:۴۲　▶</span>
              <div className="relative z-10 grid size-16 place-items-center rounded-full bg-white/20 text-3xl text-white ring-8 ring-white/10" aria-hidden="true">▶</div>
              <p className="absolute bottom-20 text-sm text-white/75">ویدئوی نمونه؛ پخش در این دمو فعال نیست.</p>
            </div>
            <div className="space-y-3 bg-[#1c1a30] p-4">
              <div className="relative h-1.5 rounded-full bg-[#4e4a75]" aria-label="پیشرفت نمونهٔ ویدئو">
                <div className="h-full w-[41%] rounded-full bg-dena-brand" />
                <span className="absolute left-[41%] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-white bg-dena-brand" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs text-white">
                  <button type="button" disabled aria-label="پخش ویدئو" className="text-lg opacity-70">▶</button>
                  <button type="button" disabled aria-label="رفتن به بخش بعدی" className="opacity-70">⏭</button>
                  <span dir="ltr">۱۸:۴۲ <span className="text-white/50">/ ۴۵:۱۰</span></span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/80">
                  <button type="button" disabled aria-label="صدا" className="opacity-70">◖))</button>
                  <span className="rounded border border-white/40 px-1.5 py-0.5 text-[10px]">CC</span>
                  <span dir="ltr">1.0x</span>
                  <button type="button" disabled aria-label="تمام‌صفحه" className="opacity-70">⛶</button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Card className="space-y-3 rounded-2xl p-5 md:p-6">
              <p className="text-xs font-bold text-dena-brand">{course.title} · جلسه {currentSessionNumber}</p>
              <h2 className="text-xl font-extrabold text-dena-deep">{lesson}</h2>
              <p className="text-sm leading-7 text-dena-muted">در این جلسه با مفهوم درس آشنا می‌شوی و نکته‌های اصلی را همراه با مثال مرور می‌کنی. محتوای نمایشی به حساب واقعی متصل نیست.</p>
            </Card>
            <Card className="space-y-3 rounded-2xl p-5">
              <p className="text-xs text-dena-muted">مدرس دوره</p>
              <p className="font-bold text-dena-deep">استاد احمدی</p>
              <p className="border-t border-dena-border pt-3 text-xs leading-6 text-dena-muted">پیشرفت جلسه در این دمو ذخیره نمی‌شود.</p>
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
    return <div className="space-y-5"><Link href="/student-demo/assessments" className="text-sm font-bold text-dena-brand">بازگشت به تمرین‌ها و آزمون‌ها ←</Link><Card className="space-y-5 rounded-[22px] p-6 md:p-8"><span className="w-fit rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">{item.label}</span><h2 className="text-2xl font-extrabold text-dena-deep">{item.title}</h2><p className="text-sm text-dena-muted">دوره: {item.course}</p><p className="text-sm leading-7 text-dena-muted">{item.status==="ready"?"این ارزیابی نمونه آمادهٔ شروع است.":item.status==="pending"?"این فعالیت در انتظار بازبینی و فعال‌شدن است.":"نتیجهٔ نمونه برای مرور در دسترس است."}</p>{item.status==="ready"?<Link href="/student-demo/assessments/math-7-practice" className={buttonClassName()}>شروع آزمون</Link>:<p className="rounded-xl bg-dena-bg p-4 text-sm">در نسخهٔ نمایشی، پاسخ یا نتیجهٔ واقعی ثبت نمی‌شود.</p>}</Card></div>;
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
  const milestones=[{title:"مرور درس تکمیل شد",label:"ارزیابی اولیه",tone:"bg-emerald-400"},{title:"نیاز به مرور",label:"فصل اول",tone:"bg-amber-400"},{title:"آزمون یادگیری",label:"فصل دوم",tone:"bg-dena-brand"},{title:"آزمون یادگیری فصل سوم",label:"اکنون",tone:"bg-dena-brand"}];
  const courses=[{name:"ریاضی دهم",progress:33,detail:"جلسه ۸ از ۲۴ · در حال پیشرفت"},{name:"فیزیک دهم",progress:27,detail:"جلسه ۵ از ۱۸ · در حال پیشرفت"},{name:"شیمی دهم",progress:12,detail:"جلسه ۲ از ۱۶ · شروع‌شده"}];
  const activity=[{when:"امروز",text:"جلسه ۷ ریاضی دهم تکمیل شد"},{when:"دیروز",text:"آزمون یادگیری تابع با موفقیت انجام شد"},{when:"۳ روز پیش",text:"مرور مجدد یک جلسه تکمیل شد"}];
  return <div className="space-y-6">
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
  </div>;
}

function ProfileDemo({ edit = false }: { edit?: boolean }) {
  if(edit) return <div className="mx-auto max-w-3xl"><Card className="space-y-5 rounded-[22px] p-6 md:p-8"><Link href="/student-demo/profile" className="text-sm font-bold text-dena-brand">بازگشت به پروفایل ←</Link><h2 className="text-2xl font-extrabold text-dena-deep">ویرایش پروفایل</h2><label className="block space-y-2 text-sm"><span>نام و نام خانوادگی</span><input readOnly value="محمد علوی" className="w-full rounded-xl border border-dena-border bg-dena-bg px-4 py-3"/></label><p className="text-xs text-dena-muted">در پیش‌نمایش امکان ذخیرهٔ اطلاعات واقعی وجود ندارد.</p><button type="button" disabled className={buttonClassName()+" opacity-60"}>ذخیرهٔ تغییرات</button></Card></div>;
  return <div className="space-y-5">
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

export default async function StudentDemoPage({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ filter?: string }> }) {
  const { section: path = [] } = await params;
  const { filter = "all" } = await searchParams;
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
    content = <LessonDetail course={course} lessonNumber={lessonNumber} />;
  } else if (isCoursePath && path[2] === "team" && path.length === 3 && course) content = <CourseTeam course={course} />;
  else if (isCoursePath && path[2] === "team" && path.length === 4 && course) content = <TeamMember course={course} roleId={path[3]} conversation={false} />;
  else if (isCoursePath && path[2] === "team" && path.length === 5 && path[4] === "conversation" && course) content = <TeamMember course={course} roleId={path[3]} conversation />;
  else if (path[0] === "assessments" && path.length === 1) content = <AssessmentsDemo filter={filter} />;
  else if (path[0] === "assessments" && path[1] === "math-7-practice" && path.length === 2) content = <DemoPracticeCard />;
  else if (path[0] === "assessments" && path.length === 2) content = <AssessmentsDemo detail={path[1]} />;
  else if (path[0] === "profile" && path[1] === "edit" && path.length === 2) content = <ProfileDemo edit />;
  else if (path[0] === "profile" && path[1] && path.length === 2) content = <div className="mx-auto max-w-3xl"><Card className="space-y-4 p-6"><Link href="/student-demo/profile" className="text-sm font-bold text-dena-brand">بازگشت به پروفایل ←</Link><h2 className="text-xl font-extrabold">{path[1]==="privacy"?"حریم خصوصی و داده‌ها":"تغییر شماره موبایل"}</h2><p className="text-sm leading-7 text-dena-muted">این بخش در نسخهٔ نمایشی فقط برای مرور صفحه است و تغییری در حساب واقعی ایجاد نمی‌کند.</p></Card></div>;
  else if (pageKey === "ai-tutor") content = <AiTutor />;
  else if (path[0] === "elite-club") content = <EliteClubDemo path={path.slice(1)} />;
  else if (path.length === 1) content = <GenericDemo section={pageKey as keyof typeof pages} />;
  else notFound();

  const title = pageKey === "ai-tutor" ? "معلم هوشمند" :
    isCoursePath && path[2] === "team" ? path[3] ? "تیم آموزشی دوره" : "تیم آموزشی دوره" :
    isCoursePath && path[2] === "lessons" ? "مشاهده جلسه آموزشی" :
    course ? course.title : page.title;

  return <StudentShell active={page.active} title={title} demo><DemoNotice />{content}</StudentShell>;
}
