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
    title: "ریاضی پایه هفتم",
    provider: "مؤسسهٔ نمونهٔ دنا",
    done: 8,
    total: 12,
    lessons: ["عددهای صحیح", "عددهای گویا", "جبر و معادله", "هندسه و ترسیم"],
  },
  {
    id: "science-7",
    title: "علوم تجربی پایه هفتم",
    provider: "مؤسسهٔ نمونهٔ دنا",
    done: 5,
    total: 10,
    lessons: ["تجربه و تفکر", "اندازه‌گیری در علوم", "اتم‌ها و مواد", "انرژی و تبدیل‌ها"],
  },
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
  return (
    <div className="space-y-7">
      <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه من در دنا</p>
        <h2 className="mt-2 text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          سلام، دانش‌آموز نمونه 👋
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          یادگیری‌ات را از همین‌جا ادامه بده؛ دوره‌ها و فعالیت‌های این صفحه برای نمایش رابط ساخته شده‌اند.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/student-demo/courses" className={buttonClassName()}>دوره‌های من</Link>
          <Link href="/student-demo/ai-tutor" className={buttonClassName("outline")}>معلم هوشمند</Link>
          <Link href="/student-demo/growth" className={buttonClassName("outline")}>مسیر رشد</Link>
          <Link href="/student-demo/assessments" className={buttonClassName("outline")}>تمرین‌ها و آزمون‌ها</Link>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading id="demo-learning-overview" note="اطلاعات آزمایشی برای نمایش رابط">نمای کلی یادگیری</SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-[22px]"><p className="text-[13px] text-dena-muted">دوره‌های من</p><p className="mt-2 text-[29px] font-extrabold text-dena-brand">۲</p><p className="mt-1 text-xs text-dena-muted">دورهٔ نمونه</p></Card>
          <Card className="p-[22px]"><p className="text-[13px] text-dena-muted">تمرین‌های باز</p><p className="mt-2 text-[29px] font-extrabold text-dena-deep">۳</p><p className="mt-1 text-xs text-dena-muted">فعالیت نمونه</p></Card>
          <Card className="p-[22px]"><p className="text-[13px] text-dena-muted">میانگین فعالیت</p><p className="mt-2 text-[29px] font-extrabold text-dena-deep">۶۵٪</p><p className="mt-1 text-xs text-dena-muted">عدد نمایشی</p></Card>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading id="demo-courses" note="محتوا و پیشرفت صرفاً نمونه است">ادامهٔ یادگیری</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          {demoCourses.map((course) => (
            <Card key={course.id} className="space-y-4 rounded-[22px] p-6">
              <div><p className="text-sm font-bold text-dena-brand">{course.provider}</p><h3 className="mt-2 text-lg font-extrabold text-dena-deep">{course.title}</h3></div>
              <div className="flex justify-between text-xs text-dena-muted"><span>درس‌های تکمیل‌شده</span><span>{course.done} از {course.total}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{ width: `${Math.round(course.done / course.total * 100)}%` }} /></div>
              <Link href={`/student-demo/courses/${course.id}`} className={buttonClassName("outline")}>بازکردن دوره</Link>
            </Card>
          ))}
        </div>
      </section>
      <Card className="border-dena-lavender"><h2 className="font-bold text-dena-deep">آزمون پیش رو</h2><p className="mt-2 text-sm leading-7 text-dena-muted">آزمون نمونهٔ ریاضی · شنبه، ساعت ۱۰:۰۰</p><Link href="/student-demo/assessments" className="mt-4 inline-flex text-sm font-bold text-dena-brand">مشاهدهٔ تمرین‌ها و آزمون‌ها ←</Link></Card>
    </div>
  );
}

function CourseList() {
  return (
    <div className="space-y-6">
      <section className="rounded-[22px] bg-dena-lavender p-6">
        <h2 className="text-2xl font-extrabold text-dena-deep">دوره‌های من</h2>
        <p className="mt-2 text-sm text-dena-muted">فهرست و جزئیات این دوره‌ها در این دموی نمایشی نمونه‌اند.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {demoCourses.map((course) => (
          <Card key={course.id} className="space-y-4 rounded-[22px] p-6">
            <div><p className="text-xs font-bold text-dena-brand">{course.provider}</p><h3 className="mt-2 font-extrabold">{course.title}</h3></div>
            <p className="text-sm text-dena-muted">{course.total} درس · {course.done} درس تکمیل‌شده در دادهٔ نمونه</p>
            <Link href={`/student-demo/courses/${course.id}`} className={buttonClassName()}>جزئیات دوره و درس‌ها</Link>
          </Card>
        ))}
      </div>
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
  const lesson = course.lessons[lessonNumber - 1];
  if (!lesson) notFound();
  return (
    <div className="space-y-5">
      <Link href={`/student-demo/courses/${course.id}`} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به دوره</Link>
      <Card className="space-y-4 rounded-[22px] p-6 md:p-8">
        <p className="text-xs font-bold text-dena-brand">{course.title} · درس {lessonNumber}</p>
        <h2 className="text-2xl font-extrabold text-dena-deep">{lesson}</h2>
        <div className="grid aspect-video place-items-center rounded-[22px] bg-dena-deep text-white"><div className="text-center"><span className="text-4xl">▶</span><p className="mt-3 text-sm">ویدئوی نمونه؛ پخش در این دمو فعال نیست.</p></div></div>
        <p className="text-sm leading-7 text-dena-muted">این صفحه فقط برای مرور چیدمان درس است و محتوای آموزشی واقعی ندارد.</p>
      </Card>
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
      <section className="rounded-[22px] bg-dena-lavender p-6 md:p-8">
        <p className="text-sm font-bold text-dena-brand">همراه یادگیری دنا</p>
        <h2 className="mt-2 text-2xl font-extrabold text-dena-deep">معلم هوشمند، در مسیر یادگیری تو</h2>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          نسخهٔ آغازین در پنل اصلی فعال است و پاسخ را از دیتاست دنا یا بخش مرتبطِ رونوشت دستیِ ویدئوی مجاز پیدا می‌کند. اگر محتوای مرتبطی نباشد، پاسخ ساخته نمی‌شود.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-dena-ink">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          نسخهٔ آغازین در پنل اصلی فعال است
        </span>
      </section>

      <Card className="space-y-4 rounded-[22px] p-6">
        <h3 className="font-extrabold text-dena-deep">نمونهٔ گفت‌وگو</h3>
        <p className="w-fit max-w-[90%] rounded-2xl bg-dena-bg p-4 text-sm leading-7">
          چطور عدد منفی را در عدد منفی ضرب کنم؟
        </p>
        <p className="mr-auto w-fit max-w-[90%] rounded-2xl bg-dena-lavender p-4 text-sm leading-7">
          در ضرب دو عدد منفی، حاصل مثبت می‌شود. برای نمونه، (−۳) × (−۲) = ۶.
        </p>
        <p className="border-t border-dena-border pt-3 text-xs leading-6 text-dena-muted">
          این گفت‌وگو فقط نمونهٔ رابط است؛ از این پیش‌نمایش پرسشی به مدل ارسال یا سابقه‌ای ذخیره نمی‌شود.
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
function GrowthDemo() {
  const attempts = [
    { label: "تلاش ۱", percent: 40 },
    { label: "تلاش ۲", percent: 60 },
    { label: "تلاش ۳", percent: 50 },
    { label: "تلاش ۴", percent: 75 },
  ];
  const chartPoints = attempts.map((attempt, index) => ({
    ...attempt,
    x: 36 + index * 88,
    y: 164 - attempt.percent * 1.2,
  }));
  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Card className="space-y-4 rounded-[22px] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-dena-brand">ریاضی پایه هفتم · ارزیابی نمونه</p>
          <h2 className="mt-2 text-xl font-extrabold text-dena-deep">روند پاسخ‌های درست</h2>
          <p className="mt-2 text-sm leading-7 text-dena-muted">درصد پاسخ درست در تلاش‌های همین ارزیابی</p>
        </div>
        <div className="rounded-xl bg-dena-lavender px-4 py-3">
          <p className="text-xs text-dena-muted">آخرین تلاش</p>
          <p className="mt-1 text-xl font-extrabold text-dena-brand">۷۵٪</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 390 210"
          role="img"
          aria-label="روند پاسخ درست در چهار تلاش از همین ارزیابی: ۴۰، ۶۰، ۵۰ و ۷۵ درصد"
          className="min-w-[350px] w-full"
        >
          {[44, 104, 164].map((y, index) => (
            <g key={y}>
              <line x1="28" y1={y} x2="370" y2={y} className="stroke-dena-border" strokeDasharray="4 6" />
              <text x="378" y={y + 4} textAnchor="end" className="fill-dena-muted text-[11px]">
                {index === 0 ? "۱۰۰٪" : index === 1 ? "۵۰٪" : "۰٪"}
              </text>
            </g>
          ))}
          <polyline points={line} className="fill-none stroke-dena-brand" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {chartPoints.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="6" className="fill-dena-mint stroke-white" strokeWidth="2" />
              <text x={point.x} y="192" textAnchor="middle" className="fill-dena-muted text-[11px]">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
        اعداد نمودار نمونه‌اند. در نسخهٔ واقعی، هر روند فقط برای همان ارزیابی نمایش داده می‌شود؛ این درصد نمرهٔ رسمی یا اثبات یادگیری نیست و تفاوت نسخه‌های سؤال می‌تواند بر روند اثر بگذارد.
      </p>
      <Link href="/student-demo/assessments" className={buttonClassName("outline")}>رفتن به تمرین‌ها و آزمون‌ها</Link>
    </Card>
  );
}

function GenericDemo({ section }: { section: keyof typeof pages }) {
  if (section === "growth") return <GrowthDemo />;
  if (section === "services") return <StudentDemoServiceCenter />;
  if (section === "notifications") return <StudentDemoSupportNotifications />;

  const contents: Partial<Record<keyof typeof pages, { title: string; description: string; values: string[] }>> = {
    assessments: { title: "تمرین‌ها و آزمون‌ها", description: "فعالیت‌های زیر برای نمایش رابط ساخته شده‌اند.", values: ["تمرین نمونهٔ ریاضی · در انتظار پاسخ", "آزمون نمونهٔ علوم · شنبه، ساعت ۱۰:۰۰", "مرور درس چهارم · تکمیل‌شده"] },
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
    profile: { title: "پروفایل کاربری", description: "مشخصات حساب واقعی در حالت دمو نمایش داده نمی‌شود.", values: ["دانش‌آموز نمونه", "پایهٔ هفتم · نمونه", "حساب نمایشی و بدون اتصال"] },
    services: { title: "مرکز خدمات", description: "درخواست‌های خدماتی در این دمو ثبت نمی‌شوند.", values: ["خدمات آموزشی", "راهنمای استفاده از دنا", "پشتیبانی فنی"] },
    notifications: { title: "اعلان‌ها", description: "این بخش در نسخهٔ فعلی پنل، اعلان‌های درخواست‌های پشتیبانی را نشان می‌دهد.", values: [] },
  };
  const content = contents[section];
  if (!content) return null;
  return <div className="space-y-6"><section className="rounded-[22px] bg-dena-lavender p-6"><h2 className="text-2xl font-extrabold text-dena-deep">{content.title}</h2><p className="mt-2 text-sm leading-7 text-dena-muted">{content.description}</p></section><div className="grid gap-4">{content.values.map((value, index) => <Card key={value} className="space-y-3"><p className="text-sm font-semibold text-dena-ink">{value}</p>{section === "assessments" && index === 0 && <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName("outline")}>شروع تمرین نمونه</Link>}</Card>)}</div></div>;
}

export default async function StudentDemoPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section: path = [] } = await params;
  const pageKey = path.length ? path.join("/") : "home";
  const page = pages[path[0] === "courses" ? "courses" : path[0] === "assessments" ? "assessments" : pageKey];
  if (!page) notFound();

  const course = path[0] === "courses" ? demoCourses.find((item) => item.id === path[1]) : undefined;
  const isCoursePath = path[0] === "courses";
  if (isCoursePath && path.length > 1 && !course) notFound();

  let content: ReactNode;
  if (pageKey === "home") content = <Home />;
  else if (pageKey === "courses" && path.length === 1) content = <CourseList />;
  else if (isCoursePath && path.length === 2 && course) content = <CourseDetail course={course} />;
  else if (isCoursePath && path[2] === "lessons" && path.length === 4 && course) {
    const lessonNumber = Number(path[3]);
    if (!Number.isInteger(lessonNumber) || lessonNumber < 1) notFound();
    content = <LessonDetail course={course} lessonNumber={lessonNumber} />;
  } else if (isCoursePath && path[2] === "team" && path.length === 3 && course) content = <CourseTeam course={course} />;
  else if (isCoursePath && path[2] === "team" && path.length === 4 && course) content = <TeamMember course={course} roleId={path[3]} conversation={false} />;
  else if (isCoursePath && path[2] === "team" && path.length === 5 && path[4] === "conversation" && course) content = <TeamMember course={course} roleId={path[3]} conversation />;
  else if (path[0] === "assessments" && path[1] === "math-7-practice" && path.length === 2) content = <DemoPracticeCard />;
  else if (pageKey === "ai-tutor") content = <AiTutor />;
  else if (path.length === 1) content = <GenericDemo section={pageKey as keyof typeof pages} />;
  else notFound();

  const title = pageKey === "ai-tutor" ? "معلم هوشمند" :
    isCoursePath && path[2] === "team" ? path[3] ? "تیم آموزشی دوره" : "تیم آموزشی دوره" :
    isCoursePath && path[2] === "lessons" ? "درس دوره" :
    course ? course.title : page.title;

  return <StudentShell active={page.active} title={title} demo><DemoNotice />{content}</StudentShell>;
}
