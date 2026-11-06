import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "../../../../components/ui/card";
import { DemoPractice } from "../../../../components/student/demo-practice";
import { StudentShell } from "../../../../components/student/student-shell";
import { demoStudentWorkspace as data, isStudentDemoEnabled } from "../../../../server/student/demo-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "اپ دانش‌آموز آزمایشی | دنا", robots: { index: false, follow: false } };

const sectionMap = {
  home: { active: "home", title: "خانه من" },
  courses: { active: "courses", title: "دوره‌های من" },
  assessments: { active: "assessments", title: "تمرین‌ها و آزمون‌ها" },
  growth: { active: "growth", title: "مسیر رشد" },
  "elite-club": { active: "elite", title: "باشگاه نخبگان" },
  profile: { active: "account", title: "پروفایل" },
  services: { active: "services", title: "خدمات" },
  "ai-tutor": { active: "aiTutor", title: "معلم هوشمند" },
  notifications: { active: "notifications", title: "اعلان‌ها" },
} as const;
type Section = keyof typeof sectionMap;
const fa = (value: number) => value.toLocaleString("fa-IR");

function Action({ to, children }: { to: string; children: ReactNode }) {
  return <Link href={to} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-dena-brand px-4 py-3 text-sm font-bold text-white">{children}</Link>;
}
function CourseCards() {
  return <div className="grid gap-4 md:grid-cols-2">
    {data.courses.map(course => {
      const progress = Math.round(100 * course.completedLessons / course.lessonCount);
      return <Card key={course.id} className="space-y-4 rounded-[20px] p-5">
        <div className="flex justify-between gap-3 text-xs"><span className="rounded-full bg-dena-lavender px-3 py-1 font-bold text-dena-brand">{course.subject}</span><span>{fa(course.completedLessons)} از {fa(course.lessonCount)} درس</span></div>
        <h3 className="text-lg font-extrabold">{course.title}</h3>
        <p className="text-xs text-dena-muted">{course.provider} · نمونه</p>
        <div><div className="flex justify-between text-xs"><span>پیشرفت آزمایشی</span><b>{fa(progress)}٪</b></div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-dena-lavender" role="progressbar" aria-label="پیشرفت نمونه" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full bg-dena-brand" style={{width: progress + "%"}} /></div></div>
        <Action to="/student/demo/assessments">شروع تمرین</Action>
      </Card>;
    })}
  </div>;
}
function Home() {
  const done = data.courses.reduce((n, course) => n + course.completedLessons, 0);
  return <div className="space-y-6">
    <section className="rounded-[22px] bg-dena-lavender px-6 py-8">
      <p className="text-sm font-bold text-dena-brand">خانه من · تجربه آزمایشی</p>
      <h2 className="mt-3 text-2xl font-extrabold text-dena-deep">سلام، {data.studentName} 👋</h2>
      <p className="my-4 text-sm leading-8 text-dena-muted">دوره‌ها و تمرین‌های تو در یک مسیر؛ اعداد و هویت‌ها ساختگی هستند.</p>
      <Action to="/student/demo/courses">ادامه یادگیری</Action>
    </section>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {[["دوره‌ها",data.courses.length],["درس‌های انجام‌شده",done],["تمرین‌های آماده",data.assessments.length]].map(([title,num]) =>
        <Card key={title} className="space-y-2 rounded-xl p-4"><p className="text-xs text-dena-muted">{title}</p><p className="text-2xl font-extrabold text-dena-brand">{fa(Number(num))}</p></Card>)}
    </div>
    <h2 className="text-xl font-extrabold">دوره‌های من</h2><CourseCards />
  </div>;
}
function Courses() { return <div className="space-y-5"><h2 className="text-2xl font-extrabold">دوره‌های من</h2><p className="text-sm text-dena-muted">دادهٔ آموزشی آزمایشی</p><CourseCards /></div>; }
function Assessments() { return <div className="space-y-5"><h2 className="text-2xl font-extrabold">تمرین‌ها و آزمون‌ها</h2>
  <p className="text-sm leading-7 text-dena-muted">نتیجه در بک‌اند آزمایشی بررسی می‌شود و نمره‌ای ذخیره نمی‌شود.</p>
  {data.assessments.map(item => <DemoPractice key={item.id} id={item.id} title={item.title} question={item.question} choices={item.choices}/>)}
</div>; }
function Growth() { const max = data.growth[data.growth.length-1].completed; return <div className="space-y-5">
  <h2 className="text-2xl font-extrabold">مسیر رشد</h2><p className="text-sm text-dena-muted">نمودار صرفاً نمونه است، نه نتیجه واقعی.</p>
  <Card className="space-y-5 rounded-[20px] p-6">{data.growth.map(item =>
    <div key={item.label}><div className="flex justify-between text-sm"><span>{item.label}</span><b>{fa(item.completed)} فعالیت نمونه</b></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full bg-dena-brand" style={{width: Math.round(item.completed/max*100) + "%"}}/></div></div>)}</Card>
</div>; }
const inactiveText: Record<Exclude<Section, "home" | "courses" | "assessments" | "growth">, string> = {
  "elite-club": "ثبت‌نام، ارزیابی و عضویت باشگاه هنوز به قرارداد عملیاتی متصل نشده و این صفحه هیچ عضویت واقعی اعطا نمی‌کند.",
  profile: "حساب نمایش‌داده‌شده ساختگی است. ورود عملیاتی از مسیر اصلی دنا انجام می‌شود.",
  services: "خرید، پرداخت، خدمات پولی و تماس در نسخه آزمایشی انجام نمی‌شوند.",
  "ai-tutor": "معلم هوشمند تولیدکننده پاسخ در این حالت نمونه فعال نیست؛ خروجی ساختگی به جای مدل واقعی نمایش داده نمی‌شود.",
  notifications: "اعلان واقعی به هیچ کاربر یا سرویس بیرونی ارسال نمی‌شود.",
};
function Inactive({ section }: { section: Exclude<Section,"home"|"courses"|"assessments"|"growth"> }) {
  return <Card className="space-y-4 rounded-[20px] p-6">
    <h2 className="text-2xl font-extrabold">{sectionMap[section].title}</h2>
    <p className="text-sm leading-8 text-dena-muted">{inactiveText[section]}</p>
    <Action to="/student/demo">خانه دانش‌آموز</Action>
  </Card>;
}
export default async function DemoPage({params}: {params: Promise<{section?: string[]}>}) {
  if (!isStudentDemoEnabled()) notFound();
  const { section } = await params;
  if ((section?.length ?? 0) > 1) notFound();
  const slug = section?.[0] ?? "home";
  if (!(slug in sectionMap)) notFound();
  const selected = slug as Section;
  return <StudentShell demo active={sectionMap[selected].active} title={sectionMap[selected].title}>
    {selected === "home" ? <Home/> : selected === "courses" ? <Courses/> : selected === "assessments" ? <Assessments/> : selected === "growth" ? <Growth/> : <Inactive section={selected}/>}
    <p className="mt-8 text-xs leading-7 text-dena-muted">تمام داده‌ها ساختگی و سمت سرور هستند. این مسیر به حساب‌ها، پرداخت‌ها یا نمرات واقعی دسترسی ندارد.</p>
  </StudentShell>;
}
