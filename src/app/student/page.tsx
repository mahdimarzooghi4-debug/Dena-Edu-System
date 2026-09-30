import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { StudentShell } from "../../components/student/student-shell";
import { getServerAccessContext } from "../../server/access/actor";
import { getStudentProgressOverview } from "../../server/student/progress-overview";
import { nextStudentCourseAction } from "../../server/student/next-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه دانش‌آموز | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentHomePage() {
  if (
    !process.env.DATABASE_URL ||
    !process.env.BETTER_AUTH_SECRET ||
    !process.env.BETTER_AUTH_URL
  ) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const { courses, hasMore } = await getStudentProgressOverview(actor.userId);
  const countLabel = hasMore ? "۲۰+" : courses.length.toLocaleString("fa-IR");

  return (
    <StudentShell active="home" title="خانه من">
      <div className="space-y-7">
        <section
          aria-labelledby="student-home-title"
          className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8"
        >
          <p className="text-sm font-bold text-dena-brand">خانه من در دنا</p>
          <h2
            id="student-home-title"
            className="mt-2 text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]"
          >
            یادگیری‌ات از همین‌جا ادامه دارد
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            فقط دوره‌هایی نمایش داده می‌شوند که ثبت‌نام فعال، انتشار معتبر و محتوای آماده دارند.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/student/courses" className={buttonClassName()}>
              دوره‌های من
            </Link>
            <Link href="/student/progress" className={buttonClassName("outline")}>
              پیگیری یادگیری
            </Link>
          </div>
        </section>

        <section aria-labelledby="student-overview" className="space-y-4">
          <SectionHeading id="student-overview" note="فقط داده مجاز و واقعی">
            نمای کلی یادگیری
          </SectionHeading>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-[22px]">
              <p className="text-[13px] font-medium text-dena-muted">
                دوره‌های قابل ادامه
              </p>
              <p
                className="mt-2 text-[29px] font-extrabold text-dena-brand"
                aria-label={hasMore ? "بیش از بیست دوره" : undefined}
              >
                {countLabel}
              </p>
              <p className="mt-1 text-xs leading-6 text-dena-muted">
                در فهرست فعلی دانش‌آموز
              </p>
            </Card>
            <Card className="p-[22px]">
              <p className="text-[13px] font-medium text-dena-muted">
                ویدئوهای آماده در دوره‌های نمایش‌داده‌شده
              </p>
              <p className="mt-2 text-[29px] font-extrabold text-dena-deep">
                {courses
                  .reduce((sum, course) => sum + course.readyVideos, 0)
                  .toLocaleString("fa-IR")}
              </p>
              <p className="mt-1 text-xs leading-6 text-dena-muted">
                شمار محتوای آماده، نه درصد پیشرفت
              </p>
            </Card>
            <Card className="p-[22px]">
              <p className="text-[13px] font-medium text-dena-muted">
                علامت‌های انجام‌شده توسط خودت
              </p>
              <p className="mt-2 text-[29px] font-extrabold text-dena-deep">
                {courses
                  .reduce((sum, course) => sum + course.markedVideos, 0)
                  .toLocaleString("fa-IR")}
              </p>
              <p className="mt-1 text-xs leading-6 text-dena-muted">
                خوداظهاری؛ اثبات تماشا یا نمره نیست
              </p>
            </Card>
          </div>
        </section>

        <section aria-labelledby="my-courses" className="space-y-4">
          <SectionHeading id="my-courses">ادامه یادگیری در دوره‌ها</SectionHeading>
          {courses.length === 0 ? (
            <Card className="space-y-4">
              <h3 className="text-lg font-extrabold">
                فعلاً دورهٔ قابل ادامه‌ای نداری
              </h3>
              <p className="text-sm leading-8 text-dena-muted">
                دوره‌ای ثبت‌نام نکرده‌ای یا دسترسی قبلی به‌دلیل تغییر وضعیت انتشار،
                نظارت یا محتوای آماده دیگر برقرار نیست.
              </p>
              <Link href="/student/courses" className={buttonClassName("secondary")}>
                دیدن دوره‌ها
              </Link>
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => {
                const action = nextStudentCourseAction(
                  course.courseId,
                  course.readyVideos,
                  course.markedVideos,
                  course.practice.state,
                );
                return (
                  <li
                    key={course.courseId}
                    className="space-y-4 rounded-2xl border border-dena-border bg-white p-6"
                  >
                    <div>
                      <p className="text-xs font-semibold text-dena-brand">
                        ثبت‌نام فعال
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold leading-8">
                        {course.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-7 text-dena-deep">
                      علامت‌خورده توسط خودت:{" "}
                      <strong>{course.markedVideos.toLocaleString("fa-IR")}</strong>
                      {" "}از{" "}
                      <strong>{course.readyVideos.toLocaleString("fa-IR")}</strong>
                      {" "}ویدئوی آماده
                    </p>
                    <p className="text-xs leading-7 text-dena-muted">
                      {course.practice.state === "not_attempted"
                        ? "تمرین کوتاه تأییدشده در انتظار پاسخ توست."
                        : course.practice.state === "answered"
                          ? "پاسخ تمرین کوتاه تو ثبت شده است."
                          : "تمرین کوتاه تأییدشده‌ای در دسترس نیست."}
                    </p>
                    <Link href={action.href} className={buttonClassName()}>
                      {action.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && (
            <p className="text-sm text-dena-muted">
              این صفحه حداکثر ۲۰ دوره اخیرِ قابل ادامه را نمایش می‌دهد.
            </p>
          )}
        </section>

        <section aria-labelledby="student-privacy-shortcut" className="space-y-4">
          <SectionHeading id="student-privacy-shortcut">حریم خصوصی و داده</SectionHeading>
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-sm leading-8 text-dena-muted">
              یادداشت‌های شخصی ویدئو فقط برای خود دانش‌آموز قابل مشاهده‌اند و از گزارش‌های مؤسسه،
              سازمان و خیر جدا نگه داشته می‌شوند.
            </p>
            <Link href="/student/privacy" className={buttonClassName("secondary")}>
              مدیریت یادداشت‌های شخصی
            </Link>
          </Card>
        </section>
      </div>
    </StudentShell>
  );
}
