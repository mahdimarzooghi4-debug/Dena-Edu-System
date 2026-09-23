import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getStudentDashboardCourses } from "../../server/student/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه دانش‌آموز | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentHomePage() {
  // Public preview/builds must not need a live auth/database environment.
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const { courses, hasMore } = await getStudentDashboardCourses(actor.userId);
  const countLabel = hasMore ? "۲۰+" : courses.length.toLocaleString("fa-IR");

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/account"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حساب من
        </Link>
        <Link href="/student/progress" className={buttonClassName()}>
          پیگیری ویدئوهای انجام‌شده
        </Link>
        <Link href="/student/courses" className={buttonClassName("secondary")}>
          مشاهده دوره‌های رایگان
        </Link>
      </header>

      <section aria-labelledby="student-home-title"
        className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه من در دنا</p>
        <h1 id="student-home-title"
          className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          یادگیری‌ات از همین‌جا ادامه دارد
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          دوره‌های رایگانی را می‌بینی که خودت در آن‌ها ثبت‌نام فعال داری و
          محتوایشان همچنان با تأیید مؤسسه مسئول در دسترس است.
        </p>
      </section>

      <section aria-labelledby="student-overview" className="space-y-4">
        <SectionHeading id="student-overview" note="فقط دادهٔ مجاز و واقعی">
          نمای کلی یادگیری
        </SectionHeading>
        <Card className="max-w-sm p-[22px]">
          <p className="text-[13px] font-medium text-dena-muted">
            دوره‌های قابل ادامه در این فهرست
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand"
            aria-label={hasMore ? "بیش از بیست دوره" : undefined}>
            {countLabel}
          </p>
          <p className="mt-1 text-xs leading-6 text-dena-muted">
            ثبت‌نام فعال · انتشار معتبر · ویدئوی آماده
          </p>
        </Card>
      </section>

      <section aria-labelledby="my-courses" className="space-y-4">
        <SectionHeading id="my-courses">ادامه یادگیری در دوره‌ها</SectionHeading>
        {courses.length === 0 ? (
          <Card className="space-y-4">
            <h3 className="text-lg font-extrabold">
              فعلاً دورهٔ قابل ادامه‌ای نداری
            </h3>
            <p className="text-sm leading-8 text-dena-muted">
              دوره‌ای ثبت‌نام نکرده‌ای یا دسترسی به دوره‌های قبلی بر اثر تغییر
              وضعیت انتشار، نظارت، عضویت یا محتوای آماده دیگر برقرار نیست.
            </p>
            <Link href="/student/courses" className={buttonClassName("secondary")}>
              دیدن دوره‌های رایگان
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <li key={course.courseId}
                className="space-y-4 rounded-2xl border border-dena-border bg-white p-6">
                <h3 className="text-lg font-extrabold leading-8">
                  {course.title}
                </h3>
                <p className="text-sm leading-7 text-dena-muted">
                  ثبت‌نام رایگان فعال · نظارت این دوره تأیید شده
                </p>
                <Link href={`/student/courses/${course.courseId}/watch`}
                  className={buttonClassName()}>
                  ادامه مشاهده ویدئو
                </Link>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <p className="text-sm text-dena-muted">
            این صفحه حداکثر ۲۰ دورهٔ اخیرِ قابل ادامه را نمایش می‌دهد.
          </p>
        )}
      </section>

      <section aria-labelledby="coming-soon" className="space-y-4">
        <SectionHeading id="coming-soon">تمرین، آزمون و مسیر رشد</SectionHeading>
        <Card>
          <p className="text-sm leading-8 text-dena-muted">
            علامت‌های انجام‌شدهٔ ویدئوها اکنون قابل پیگیری‌اند؛
            تمرین نمره‌دار و آزمون هنوز عملیاتی نشده‌اند و نتیجه یا
            درصد پیشرفت تخمینی نمایش داده نمی‌شود.
          </p>
          <Link href="/student/progress"
            className={buttonClassName("secondary", "mt-4")}>
            دیدن پیگیری شخصی ویدئوها
          </Link>
        </Card>
      </section>
    </main>
  );
}
