import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getProviderDashboardCourses } from "../../server/provider/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه ارائه‌دهنده | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار بررسی مؤسسه",
  approved: "تأیید نظارت همین دوره",
  revoked: "رد یا لغو نظارت",
} as const;

const publicationLabels = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  archived: "بایگانی‌شده",
} as const;

const practiceLabels = {
  not_created: "ثبت نشده",
  pending: "در انتظار بررسی مستقل مؤسسه",
  approved: "تأییدشده برای نمایش به دانش‌آموز",
  rejected: "ردشده و از دانش‌آموز پنهان",
} as const;

export default async function ProviderHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const providerIds = [...new Set(actor.memberships.flatMap((entry) =>
    entry.role === "provider" ? [entry.providerId] : []))];
  if (!providerIds.length) notFound();

  const { courses, hasMore } = await getProviderDashboardCourses(providerIds);
  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/account"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حساب من
        </Link>
        <Link href="/provider/supervision" className={buttonClassName("secondary")}>
          مدیریت درخواست‌های نظارت دوره
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه ارائه‌دهنده در دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          دوره‌های من و وضعیت نظارت
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          وضعیت فعلی دوره‌های مربوط به محدودهٔ ارائه‌دهندگی فعال شما نمایش
          داده می‌شود. ایجاد دوره، تأیید مؤسسه و انتشار هرکدام مجوز مستقل دارند.
        </p>
      </section>

      <section aria-labelledby="provider-overview" className="space-y-4">
        <SectionHeading id="provider-overview" note="بر پایهٔ رکوردهای همین فهرست">
          نمای کلی دوره‌ها
        </SectionHeading>
        <Card className="max-w-sm">
          <p className="text-sm text-dena-muted">دوره‌های نمایش‌داده‌شده</p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {hasMore ? "۲۰+" : courses.length.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            فقط دوره‌های محدودهٔ فعال؛ این عدد شمار دانش‌آموز یا درآمد نیست.
          </p>
        </Card>
      </section>

      <section aria-labelledby="provider-courses" className="space-y-4">
        <SectionHeading id="provider-courses">
          آخرین دوره‌ها و درخواست‌ها
        </SectionHeading>
        {courses.length === 0 ? (
          <Card className="space-y-4">
            <h2 className="text-lg font-extrabold">دوره‌ای ثبت نشده است</h2>
            <p className="text-sm leading-8 text-dena-muted">
              برای هر دوره باید مؤسسهٔ مسئول جداگانه درخواست نظارت را بررسی کند.
            </p>
            <Link href="/provider/supervision"
              className={buttonClassName("secondary")}>
              ثبت درخواست نظارت دوره
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
                {course.supervisionStatus === "approved" && (
                  <Link href={`/provider/courses/${course.courseId}/practice`}
                    className={buttonClassName("secondary")}>
                    سؤال تمرینی دوره
                  </Link>
                )}
                {course.supervisionStatus === "approved" &&
                  course.publicationStatus === "draft" && (
                    <Link href={`/provider/courses/${course.courseId}/media`}
                      className={buttonClassName("secondary")}>
                      دریافت و پیگیری ویدئوی آزمایشی
                    </Link>
                  )}
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <p className="text-sm text-dena-muted">
            این صفحه حداکثر ۲۰ دورهٔ اخیر را نشان می‌دهد؛
            فهرست درخواست‌های نظارت جداگانه در دسترس است.
          </p>
        )}
      </section>

      <Card>
        <h2 className="text-lg font-extrabold">دامنهٔ این فاز</h2>
        <p className="mt-3 text-sm leading-8 text-dena-muted">
          یک تمرین چهارگزینه‌ایِ اختیاری برای هر دوره اکنون قابل ثبت است؛
          شمار ویدئوهای آماده و وضعیت بررسی سؤال فقط metadata واقعی همان دوره‌اند.
          تکلیف جامع، آزمون رسمی، آمار دانش‌آموزان و درآمد هنوز به این صفحه متصل نیستند.
          تأیید نقش ارائه‌دهنده به معنی تأیید خودکار نظارت یا انتشار دوره نیست.
        </p>
      </Card>
    </main>
  );
}
