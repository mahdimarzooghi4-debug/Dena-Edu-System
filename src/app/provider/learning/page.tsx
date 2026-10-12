import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import { getProviderDashboardCourses } from "../../../server/provider/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "آمادگی آموزشی دوره‌ها | دنا", robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار تصمیم مؤسسه",
  approved: "نظارت دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "ثبت نشده", pending: "در انتظار بازبینی",
  approved: "تأییدشده برای نمایش", rejected: "ردشده و پنهان",
} as const;
const fa = (value: number) => value.toLocaleString("fa-IR");

export default async function ProviderLearningPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const providerIds = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "provider" ? [item.providerId] : []))];
  if (!providerIds.length) notFound();

  const { courses, hasMore } = await getProviderDashboardCourses(providerIds);
  const supervised = courses.filter((course) => course.supervisionStatus === "approved").length;
  const pendingSupervision = courses.filter((course) => course.supervisionStatus === "requested").length;
  const pendingPractice = courses.filter((course) => course.practiceReviewStatus === "pending").length;
  const pendingAssessments = courses.reduce((total, course) =>
    total + course.learningAssessmentReviews.pending, 0);
  const readyVideos = courses.reduce((total, course) => total + course.readyVideos, 0);

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/provider" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به خانهٔ ارائه‌دهنده</Link>
        <Link href="/account" className={buttonClassName("secondary")}>حساب من</Link>
      </header>
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">پایش محتوای آموزشی</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">آمادگی آموزشی دوره‌ها</h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          این صفحه وضعیت نظارت، محتوای آماده و صف بازبینی دوره‌های محدودهٔ ارائه‌دهندگی شما را نشان می‌دهد؛ تلاش‌ها و نتیجهٔ فردی دانش‌آموزان در آن نیست.
        </p>
      </section>
      <nav aria-label="بخش‌های پنل ارائه‌دهنده" className="flex flex-wrap gap-2">
        <Link href="/provider" className={buttonClassName("secondary")}>خانهٔ ارائه‌دهنده</Link>
        <Link href="/provider/courses" className={buttonClassName("secondary")}>دوره‌ها</Link>
        <Link href="/provider/supervision" className={buttonClassName("secondary")}>درخواست‌های نظارت</Link>
        <Link href="/provider/learning" className={buttonClassName()}>آمادگی آموزشی</Link>
      </nav>
      <section aria-label="وضعیت دوره‌ها" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="دوره‌های بررسی‌شده" value={courses.length} />
        <Metric label="نظارت تأییدشده" value={supervised} />
        <Metric label="در انتظار تصمیم مؤسسه" value={pendingSupervision} />
        <Metric label="تمرین در صف بازبینی" value={pendingPractice} />
        <Metric label="ارزیابی در صف بازبینی" value={pendingAssessments} />
        <Metric label="ویدئوی آماده در همین فهرست" value={readyVideos} />
      </section>
      {courses.length === 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-extrabold">دوره‌ای برای پایش ثبت نشده است</h2>
          <p className="text-sm leading-8 text-dena-muted">
            پس از ثبت دوره و درخواست نظارت از مؤسسه، وضعیت آن در اینجا نمایش داده می‌شود.
          </p>
          <Link href="/provider/supervision" className={buttonClassName("secondary")}>مدیریت درخواست‌های نظارت</Link>
        </Card>
      ) : (
        <section aria-labelledby="provider-learning-courses" className="space-y-4">
          <h2 id="provider-learning-courses" className="text-xl font-extrabold">وضعیت محتوا و بازبینی هر دوره</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <li key={course.courseId} className="space-y-3 rounded-2xl border border-dena-border bg-white p-5">
                <h3 className="text-lg font-extrabold leading-8">{course.title}</h3>
                <p className="text-sm text-dena-muted">مؤسسهٔ مسئول: {course.instituteName}</p>
                <p className="text-sm text-dena-muted">نظارت: {supervisionLabels[course.supervisionStatus]}</p>
                <p className="text-sm text-dena-muted">انتشار: {publicationLabels[course.publicationStatus]}</p>
                <p className="text-sm text-dena-muted">ویدئوهای آماده: {fa(course.readyVideos)}</p>
                <p className="text-sm text-dena-muted">سؤال تمرینی: {practiceLabels[course.practiceReviewStatus]}</p>
                <p className="text-sm text-dena-muted">ارزیابی در انتظار بازبینی: {fa(course.learningAssessmentReviews.pending)}</p>
                <Link href={`/provider/courses/${course.courseId}`} className={buttonClassName("secondary")}>جزئیات همین دوره</Link>
              </li>
            ))}
          </ul>
          {hasMore && <p className="text-xs leading-6 text-dena-muted">این نما ۲۰ دورهٔ اخیر را پوشش می‌دهد؛ آمار و کارت‌ها به همین محدوده محدودند.</p>}
        </section>
      )}
      <Card className="space-y-2">
        <h2 className="font-extrabold">مرز گزارش یادگیری</h2>
        <p className="text-sm leading-7 text-dena-muted">
          شاخص نتیجهٔ آموزشی برای نقش ارائه‌دهنده هنوز تعریف و تأیید نشده است؛ این داده‌ها فقط آمادگی محتوا و صف کار را نشان می‌دهند.
        </p>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="space-y-2"><p className="text-sm text-dena-muted">{label}</p><p className="text-3xl font-extrabold text-dena-brand">{fa(value)}</p></Card>;
}
