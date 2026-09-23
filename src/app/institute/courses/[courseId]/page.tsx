import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { buttonClassName } from "../../../../components/ui/button";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteCourseDetail } from "../../../../server/institute/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "وضعیت دورهٔ مؤسسه | دنا",
  robots: { index: false, follow: false },
};
const supervisionLabels = {
  requested: "در انتظار تصمیم مستقل مؤسسه",
  approved: "نظارت همین دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "هنوز ثبت نشده",
  pending: "در انتظار بازبینی مستقل سؤال",
  approved: "تأییدشده برای نمایش به دانش‌آموز",
  rejected: "ردشده و از دانش‌آموز پنهان",
} as const;

export default async function InstituteCoursePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const scopes = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  const course = await getInstituteCourseDetail(scopes, courseId);
  if (!course) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:py-14">
      <header className="flex flex-wrap items-center gap-4">
        <Link href="/institute" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ مؤسسه
        </Link>
        <Link href="/institute/providers" className={buttonClassName("secondary")}>
          صف تصمیم‌های نظارت
        </Link>
      </header>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <div>
          <p className="text-sm font-bold text-dena-brand">
            پروندهٔ نظارت و محتوای همین دوره
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-10">
            {course.title}
          </h1>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            داده‌های همین دوره از محدودهٔ مؤسسهٔ فعال شما خوانده می‌شوند.
            این صفحه صرفاً نمای وضعیت است و به‌خودی‌خود تصمیم نظارت یا
            مجوز بازبینی سؤال صادر نمی‌کند.
          </p>
        </div>
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">ارائه‌دهندهٔ ثبت‌شده</dt>
            <dd className="mt-2 font-bold leading-8">{course.providerName}</dd>
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
            <dt className="text-sm text-dena-muted">وضعیت بررسی سؤال تمرینی</dt>
            <dd className="mt-2 font-bold leading-8">
              {practiceLabels[course.practiceReviewStatus]}
            </dd>
          </div>
        </dl>
        {course.supervisionStatus === "requested" ? (
          <section className="space-y-3" aria-label="اقدام‌های مؤسسه">
            <p className="text-sm leading-8 text-dena-muted">
              درخواست نظارت همین دوره در انتظار تصمیم مستقل مؤسسه است.
            </p>
            <Link href="/institute/providers" className={buttonClassName()}>
              رفتن به صف بررسی نظارت
            </Link>
          </section>
        ) : course.supervisionStatus === "approved" ? (
          <section className="space-y-3" aria-label="اقدام‌های مؤسسه">
            <p className="text-sm leading-8 text-dena-muted">
              بازبینی سؤال تمرینی، مستقل از تأیید نظارت دوره است؛
              نمایندهٔ هم‌زمانِ ارائه‌دهندهٔ همین دوره مجوز این تصمیم را ندارد.
            </p>
            <Link href={`/institute/courses/${course.courseId}/practice`}
              className={buttonClassName("secondary")}>
              مشاهده و بررسی مستقل سؤال تمرینی
            </Link>
            <Link href="/institute/providers" className={buttonClassName()}>
              مدیریت تصمیم نظارت
            </Link>
          </section>
        ) : (
          <p role="status" className="rounded-xl bg-dena-bg p-4 text-sm leading-8">
            نظارت همین دوره رد یا لغو شده است؛ بازبینی سؤال و دسترسی
            دانش‌آموز از این صفحه فعال نمی‌شوند.
          </p>
        )}
        <p className="text-xs leading-7 text-dena-muted">
          هیچ نتیجه، هویت یا یادداشت خصوصی دانش‌آموز در این نما نیست؛
          تأیید داخلی دنا جایگزین مجوز رسمی آموزشی نیست.
        </p>
      </Card>
    </main>
  );
}
