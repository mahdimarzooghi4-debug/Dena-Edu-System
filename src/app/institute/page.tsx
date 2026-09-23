import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getInstituteDashboardCourses } from "../../server/institute/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه مؤسسه | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار تصمیم مؤسسه",
  approved: "نظارت همین دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "ثبت نشده",
  pending: "در انتظار بازبینی مستقل مؤسسه",
  approved: "تأییدشده برای نمایش به دانش‌آموز",
  rejected: "ردشده و از دانش‌آموز پنهان",
} as const;

export default async function InstituteHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "institute" ? [item.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const { courses, hasMore } = await getInstituteDashboardCourses(instituteIds);
  // Only within the same visible, currently institute-scoped 20-course slice.
  const pendingPractices = courses.filter((course) =>
    course.supervisionStatus === "approved" &&
    course.practiceReviewStatus === "pending").length;
  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/account"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حساب من
        </Link>
        <Link href="/institute/providers" className={buttonClassName("secondary")}>
          بررسی درخواست‌های نظارت
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه مؤسسه در دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          نظارت بر دوره‌های مؤسسه
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          این فهرست فقط دوره‌های مربوط به مؤسسه‌هایی را نشان می‌دهد
          که شما در آن‌ها عضویت فعال دارید. تصمیم نظارت برای هر دوره
          جداگانه و در مسیر بررسی درخواست ثبت می‌شود.
        </p>
      </section>

      <section aria-labelledby="institute-overview" className="space-y-4">
        <SectionHeading id="institute-overview" note="بر اساس همین فهرست محدود">
          نمای کلی نظارت
        </SectionHeading>
        <Card className="max-w-sm">
          <p className="text-sm text-dena-muted">دوره‌های نمایش‌داده‌شده</p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {hasMore ? "۲۰+" : courses.length.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            این عدد شمار تمام دوره‌های مؤسسه یا تعداد دانش‌آموزان نیست.
          </p>
        </Card>
        <Card className="max-w-sm">
          <p className="text-sm text-dena-muted">
            سؤال‌های تمرینی در انتظار بازبینی مستقل
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {pendingPractices.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            فقط دوره‌های نمایش‌داده‌شده با نظارت تأییدشده؛ این عدد
            تعداد تمام درخواست‌های مؤسسه نیست.
          </p>
        </Card>
      </section>

      <section aria-labelledby="institute-courses" className="space-y-4">
        <SectionHeading id="institute-courses">
          دوره‌ها و وضعیت تصمیم نظارت
        </SectionHeading>
        {courses.length === 0 ? (
          <Card className="space-y-4">
            <h2 className="text-lg font-extrabold">
              هنوز درخواست نظارتی در این محدوده ثبت نشده است
            </h2>
            <p className="text-sm leading-8 text-dena-muted">
              درخواست‌های جدید فقط بعد از ثبت دوره توسط ارائه‌دهنده
              در فهرست مؤسسه نمایان می‌شوند.
            </p>
            <Link href="/institute/providers"
              className={buttonClassName("secondary")}>
              مشاهده صف بررسی نظارت
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <li key={course.courseId}
                className="space-y-3 rounded-2xl border border-dena-border bg-white p-6">
                <h2 className="text-lg font-extrabold leading-8">
                  {course.title}
                </h2>
                <p className="text-sm font-semibold text-dena-deep">
                  نظارت: {supervisionLabels[course.supervisionStatus]}
                </p>
                <p className="text-sm text-dena-muted">
                  انتشار: {publicationLabels[course.publicationStatus]}
                </p>
                <p className="text-sm text-dena-muted">
                  ویدئوهای آماده: {course.readyVideos.toLocaleString("fa-IR")}
                </p>
                <p className="text-sm text-dena-muted">
                  سؤال تمرینی: {practiceLabels[course.practiceReviewStatus]}
                </p>
                <Link href={`/institute/courses/${course.courseId}`}
                  className={buttonClassName()}>
                  پروندهٔ وضعیت همین دوره
                </Link>
                {course.supervisionStatus === "approved" && (
                  <Link href={`/institute/courses/${course.courseId}/practice`}
                    className={buttonClassName("secondary")}>
                    {course.practiceReviewStatus === "pending"
                      ? "بازبینی سؤال در انتظار تصمیم"
                      : "مشاهدهٔ وضعیت تمرین دوره"}
                  </Link>
                )}
                {course.supervisionStatus === "requested" && (
                  <Link href="/institute/providers"
                    className={buttonClassName("secondary")}>
                    بررسی درخواست در صف مؤسسه
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <p className="text-sm text-dena-muted">
            تنها ۲۰ درخواست اخیر در این صفحه نشان داده می‌شود؛
            صف مستقل نظارت فهرست جداگانه‌ای دارد.
          </p>
        )}
      </section>

      <Card>
        <h2 className="text-lg font-extrabold">دامنهٔ این فاز</h2>
        <p className="mt-3 text-sm leading-8 text-dena-muted">
          این صفحه آمار هویتی دانش‌آموزان، نتیجهٔ آزمون یا مدرک آموزشی
          ارائه نمی‌کند؛ تأیید مؤسسه نیز جایگزین مجوز رسمی آموزشی نیست.
        </p>
      </Card>
    </main>
  );
}
