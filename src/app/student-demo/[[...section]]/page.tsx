import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

const pages = {
  home: { title: "خانه من", active: "home" as const },
  courses: { title: "دوره‌های من", active: "courses" as const },
  assessments: { title: "تمرین‌ها و آزمون‌ها", active: "assessments" as const },
  growth: { title: "مسیر رشد", active: "growth" as const },
  "elite-club": { title: "باشگاه نخبگان", active: "elite" as const },
  profile: { title: "پروفایل کاربری", active: "account" as const },
  services: { title: "مرکز خدمات", active: "services" as const },
  notifications: { title: "اعلان‌ها", active: "notifications" as const },
};

const demoCourses = [
  { title: "ریاضی پایه هفتم", provider: "مؤسسهٔ نمونهٔ دنا", done: 8, total: 12 },
  { title: "علوم تجربی پایه هفتم", provider: "مؤسسهٔ نمونهٔ دنا", done: 5, total: 10 },
];

function DemoNotice() {
  return <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
    حالت نمایش اپ دانش‌آموز · داده‌ها نمونه‌اند و هیچ حساب یا پروندهٔ واقعی متصل نیست.
  </div>;
}

function Home() {
  return <div className="space-y-7">
    <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
      <p className="text-sm font-bold text-dena-brand">خانه من در دنا</p>
      <h2 className="mt-2 text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">سلام، دانش‌آموز نمونه 👋</h2>
      <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">یادگیری‌ات را از همین‌جا ادامه بده؛ دوره‌ها و فعالیت‌های این صفحه برای نمایش رابط ساخته شده‌اند.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/student-demo/courses" className={buttonClassName()}>دوره‌های من</Link>
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
        {demoCourses.map((course) => <Card key={course.title} className="space-y-4 rounded-[22px] p-6">
          <div><p className="text-sm font-bold text-dena-brand">{course.provider}</p><h3 className="mt-2 text-lg font-extrabold text-dena-deep">{course.title}</h3></div>
          <div className="flex justify-between text-xs text-dena-muted"><span>درس‌های تکمیل‌شده</span><span>{course.done} از {course.total}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-mint" style={{ width: `${Math.round(course.done / course.total * 100)}%` }} /></div>
          <Link href="/student-demo/courses" className={buttonClassName("outline")}>دیدن دوره‌ها</Link>
        </Card>)}
      </div>
    </section>
    <Card className="border-dena-lavender"><h2 className="font-bold text-dena-deep">آزمون پیش رو</h2><p className="mt-2 text-sm leading-7 text-dena-muted">آزمون نمونهٔ ریاضی · شنبه، ساعت ۱۰:۰۰</p><Link href="/student-demo/assessments" className="mt-4 inline-flex text-sm font-bold text-dena-brand">مشاهدهٔ تمرین‌ها و آزمون‌ها ←</Link></Card>
  </div>;
}

function CourseList() {
  return <div className="space-y-6"><section className="rounded-[22px] bg-dena-lavender p-6"><h2 className="text-2xl font-extrabold text-dena-deep">دوره‌های من</h2><p className="mt-2 text-sm text-dena-muted">فهرست دوره‌ها در این دموی نمایشی نمونه است.</p></section><div className="grid gap-4 md:grid-cols-2">{demoCourses.map((course) => <Card key={course.title} className="space-y-4"><div><p className="text-xs font-bold text-dena-brand">{course.provider}</p><h3 className="mt-2 font-extrabold">{course.title}</h3></div><p className="text-sm text-dena-muted">{course.total} درس · {course.done} درس تکمیل‌شده در دادهٔ نمونه</p><Link href="/student-demo" className={buttonClassName()}>بازگشت به خانه</Link></Card>)}</div></div>;
}

function GenericDemo({ section }: { section: keyof typeof pages }) {
  const contents: Record<string, { title: string; description: string; values: string[] }> = {
    assessments: { title: "تمرین‌ها و آزمون‌ها", description: "فعالیت‌های زیر برای نمایش رابط ساخته شده‌اند.", values: ["تمرین نمونهٔ ریاضی · در انتظار پاسخ", "آزمون نمونهٔ علوم · شنبه، ساعت ۱۰:۰۰", "مرور درس چهارم · تکمیل‌شده"] },
    growth: { title: "مسیر رشد", description: "نمایش خلاصهٔ فعالیت درسی با داده‌های آزمایشی.", values: ["ریاضی پایه هفتم · ۸ از ۱۲ درس", "علوم تجربی پایه هفتم · ۵ از ۱۰ درس", "یادآوری: این درصدها واقعی نیستند"] },
    "elite-club": { title: "باشگاه نخبگان", description: "پوستهٔ نمایشی باشگاه دانش‌آموزان.", values: ["برنامه‌های علمی", "رویدادهای آموزشی", "جزئیات عضویت در نسخهٔ عملیاتی"] },
    profile: { title: "پروفایل کاربری", description: "مشخصات حساب واقعی در حالت دمو نمایش داده نمی‌شود.", values: ["دانش‌آموز نمونه", "پایهٔ هفتم · نمونه", "حساب نمایشی و بدون اتصال"] },
    services: { title: "مرکز خدمات", description: "درخواست‌های خدماتی در این دمو ثبت نمی‌شوند.", values: ["خدمات آموزشی", "راهنمای استفاده از دنا", "پشتیبانی فنی"] },
    notifications: { title: "اعلان‌ها", description: "اعلان‌های زیر نمونه هستند.", values: ["یک درس تازه به دورهٔ نمونه اضافه شد", "تمرین نمونه آمادهٔ مشاهده است"] },
  };
  const content = contents[section];
  if (!content) return null;
  return <div className="space-y-6"><section className="rounded-[22px] bg-dena-lavender p-6"><h2 className="text-2xl font-extrabold text-dena-deep">{content.title}</h2><p className="mt-2 text-sm leading-7 text-dena-muted">{content.description}</p></section><div className="grid gap-4">{content.values.map((value) => <Card key={value}><p className="text-sm font-semibold text-dena-ink">{value}</p></Card>)}</div></div>;
}

export default async function StudentDemoPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section: path = [] } = await params;
  const pageKey = path.length ? path.join("/") : "home";
  if (!(pageKey in pages)) notFound();
  const page = pages[pageKey as keyof typeof pages];
  return <StudentShell active={page.active} title={page.title} demo>
    <DemoNotice />
    {pageKey === "home" ? <Home /> : pageKey === "courses" ? <CourseList /> : <GenericDemo section={pageKey as keyof typeof pages} />}
  </StudentShell>;
}
