import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { VerificationBadge } from "../../../components/ui/verification-badge";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getProviderDashboardCourses } from "../../../server/provider/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دوره‌های ارائه‌دهنده | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار بررسی مؤسسه",
  approved: "نظارت تأییدشده",
  revoked: "رد یا لغوشده",
} as const;

const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;

const practiceLabels = {
  not_created: "ثبت نشده",
  pending: "در انتظار بررسی مستقل مؤسسه",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;

const assessmentLabels = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;

export default async function ProviderCoursesPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const providerIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "provider" ? [membership.providerId] : []))];
  if (!providerIds.length) notFound();

  const { cursor } = await searchParams;
  const result = await getProviderDashboardCourses(providerIds, cursor);
  if (result.invalidCursor) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/provider" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ ارائه‌دهنده
        </Link>
        <Link href="/provider/supervision" className={buttonClassName("secondary")}>
          درخواست نظارت برای دوره
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">ارائه‌دهندهٔ دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          دوره‌های من
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          فهرست دوره‌های دارای سابقهٔ درخواست نظارت در محدودهٔ فعال شما؛
          انتشار یا ثبت محتوا در هر صفحه دوباره مجوزسنجی می‌شود.
        </p>
      </section>

      <section aria-labelledby="provider-courses-list" className="space-y-4">
        <SectionHeading id="provider-courses-list" note="۲۰ دوره در هر صفحه">
          دوره‌ها و وضعیت‌ها
        </SectionHeading>
        {result.courses.length === 0 ? (
          <Card className="space-y-3">
            <h2 className="font-extrabold">دوره‌ای برای نمایش نیست</h2>
            <p className="text-sm leading-7 text-dena-muted">
              درخواست نظارت برای یک دوره ثبت کنید تا وضعیت آن در این فهرست دیده شود.
            </p>
            <Link href="/provider/supervision" className={buttonClassName()}>
              ثبت درخواست نظارت
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {result.courses.map((course) => (
              <li key={course.courseId}>
                <Card className="h-full space-y-3 p-6">
                  <h2 className="text-lg font-extrabold leading-8">{course.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-dena-muted">
                    <span>{course.instituteName}</span>
                    <VerificationBadge kind="institute" />
                    {course.providerCollaborationApproved && <VerificationBadge kind="provider" />}
                  </div>
                  <p className="text-sm font-semibold">نظارت: {supervisionLabels[course.supervisionStatus]}</p>
                  <p className="text-sm text-dena-muted">انتشار: {publicationLabels[course.publicationStatus]}</p>
                  <p className="text-sm text-dena-muted">
                    ویدئوهای آماده: {course.readyVideos.toLocaleString("fa-IR")}
                  </p>
                  <p className="text-sm text-dena-muted">
                    سؤال تمرینی: {practiceLabels[course.practiceReviewStatus]}
                  </p>
                  <div className="space-y-1 rounded-xl bg-dena-bg p-4 text-sm">
                    <p className="font-bold">ارزیابی‌های یادگیری</p>
                    <dl>
                      {Object.entries(course.learningAssessmentReviews).map(([status, total]) => (
                        <div key={status} className="flex justify-between gap-3">
                          <dt className="text-dena-muted">
                            {assessmentLabels[status as keyof typeof assessmentLabels]}
                          </dt>
                          <dd className="font-bold">{total.toLocaleString("fa-IR")}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <Link href={`/provider/courses/${course.courseId}`} className={buttonClassName()}>
                    جزئیات دوره
                  </Link>
                  {course.supervisionStatus === "approved" && (
                    <Link href={`/provider/courses/${course.courseId}/assessments`}
                      className={buttonClassName("secondary")}>
                      مدیریت ارزیابی‌های یادگیری
                    </Link>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی دوره‌ها">
          {cursor && (
            <Link href="/provider/courses" className={buttonClassName("secondary")}>
              صفحهٔ نخست
            </Link>
          )}
          {result.nextCursor && (
            <Link href={`/provider/courses?cursor=${encodeURIComponent(result.nextCursor)}`}
              className={buttonClassName("secondary")}>
              دوره‌های بعدی
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
