import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { buttonClassName } from "../../../../components/ui/button";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getProviderCourseDetail } from "../../../../server/provider/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "وضعیت دورهٔ ارائه‌دهنده | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار بررسی مؤسسه",
  approved: "تأیید نظارت همین دوره",
  revoked: "رد یا لغو نظارت",
} as const;

const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;

const practiceLabels = {
  not_created: "هنوز ثبت نشده",
  pending: "در انتظار بازبینی مستقل مؤسسه",
  approved: "تأییدشده برای نمایش",
  rejected: "ردشده و از دانش‌آموز پنهان",
} as const;

export default async function ProviderCoursePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const ids = [...new Set(actor.memberships.flatMap((entry) =>
    entry.role === "provider" ? [entry.providerId] : []))];
  const course = await getProviderCourseDetail(ids, courseId);
  if (!course) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:py-14">
      <header className="flex flex-wrap items-center gap-4">
        <Link href="/provider" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ ارائه‌دهنده
        </Link>
        <Link href="/provider/supervision"
          className={buttonClassName("secondary")}>
          درخواست‌ها و انتشار دوره‌ها
        </Link>
      </header>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <div>
          <p className="text-sm font-bold text-dena-brand">
            وضعیت ثبت‌شدهٔ همین دوره
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-10">
            {course.title}
          </h1>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            این نما فقط اطلاعات جاری دوره در محدودهٔ ارائه‌دهندهٔ فعال شما
            را نشان می‌دهد و به‌تنهایی مجوز انتشار، آپلود یا پخش نیست.
          </p>
        </div>
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">مؤسسهٔ مسئول نظارت</dt>
            <dd className="mt-2 font-bold leading-8">
              {course.responsibleInstituteName}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">وضعیت نظارت</dt>
            <dd className="mt-2 font-bold leading-8">
              {supervisionLabels[course.supervisionStatus]}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">وضعیت انتشار</dt>
            <dd className="mt-2 font-bold leading-8">
              {publicationLabels[course.publicationStatus]}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">تعداد ویدئوهای آماده</dt>
            <dd className="mt-2 text-2xl font-extrabold text-dena-brand">
              {course.readyVideos.toLocaleString("fa-IR")}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5 md:col-span-2">
            <dt className="text-sm text-dena-muted">بررسی سؤال تمرینی</dt>
            <dd className="mt-2 font-bold leading-8">
              {practiceLabels[course.practiceReviewStatus]}
            </dd>
          </div>
        </dl>
        {course.supervisionStatus === "requested" ? (
          <p role="status" className="rounded-xl bg-dena-bg p-4 text-sm leading-8">
            درخواست نظارت این دوره هنوز تأیید نشده است؛
            دریافت ویدئو و ثبت سؤال جدید فعلاً مجاز نیست.
          </p>
        ) : course.supervisionStatus === "revoked" ? (
          <p role="status" className="rounded-xl bg-dena-bg p-4 text-sm leading-8">
            نظارت همین دوره لغو یا رد شده است؛ این صفحه امکان
            بارگذاری یا انتشار محتوا را باز نمی‌کند.
          </p>
        ) : course.publicationStatus === "draft" ? (
          <section className="flex flex-wrap gap-3" aria-label="اقدام‌های دوره">
            <Link href={`/provider/courses/${course.courseId}/media`}
              className={buttonClassName("secondary")}>
              دریافت و پیگیری ویدئوی آزمایشی
            </Link>
            <Link href={`/provider/courses/${course.courseId}/practice`}
              className={buttonClassName("secondary")}>
              سؤال تمرینی دوره
            </Link>
            <Link href="/provider/supervision"
              className={buttonClassName()}>
              مدیریت انتشار در فهرست درخواست‌ها
            </Link>
          </section>
        ) : course.publicationStatus === "published" ? (
          <section className="space-y-3" aria-label="اقدام‌های دوره">
            <p className="text-sm leading-8 text-dena-muted">
              این دوره منتشر شده است؛ ایجاد ویدئو و سؤال جدید در این
              پایلوت فقط برای پیش‌نویس مجاز است.
            </p>
            <Link href={`/provider/courses/${course.courseId}/practice`}
              className={buttonClassName("secondary")}>
              مشاهدهٔ وضعیت سؤال تمرینی
            </Link>
          </section>
        ) : (
          <p role="status" className="rounded-xl bg-dena-bg p-4 text-sm leading-8">
            دوره بایگانی شده است و از این نما عملیات تازه آغاز نمی‌شود.
          </p>
        )}
        <p className="text-xs leading-7 text-dena-muted">
          تأیید داخلی دنا به‌معنی مجوز رسمی آموزشی یا گواهی پایان دوره نیست؛
          این نما هیچ نتیجه، هویت یا یادداشت خصوصی دانش‌آموزی را نمایش نمی‌دهد.
        </p>
      </Card>
    </main>
  );
}
