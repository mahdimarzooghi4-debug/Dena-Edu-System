import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { VerificationBadge } from "../../../components/ui/verification-badge";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteDashboardCourses } from "../../../server/institute/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دوره‌های مؤسسه | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار تصمیم مؤسسه",
  approved: "نظارت همین دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "ثبت نشده",
  pending: "در انتظار بازبینی مستقل",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;
const assessmentLabels = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;

export default async function InstituteCoursesPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const { cursor } = await searchParams;
  const result = await getInstituteDashboardCourses(instituteIds, cursor);
  if (result.invalidCursor) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/institute" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ مؤسسه
        </Link>
        <Link href="/institute/providers" className={buttonClassName("secondary")}>
          بررسی درخواست‌های نظارت
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">مؤسسهٔ دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          دوره‌های تحت نظارت من
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          دوره‌های تحت نظارت و دوره‌های متعلق به مؤسسه در محدودهٔ فعال شما نمایش داده می‌شوند.
          آمار ارزیابی‌ها از داده‌های همان صفحه محاسبه می‌شود.
        </p>
      </section>

      <section aria-labelledby="institute-course-list" className="space-y-4">
        <SectionHeading id="institute-course-list" note="۲۰ دوره در هر صفحه">
          دوره‌ها و وضعیت‌ها
        </SectionHeading>
        {result.courses.length === 0 ? (
          <Card className="space-y-3">
            <h2 className="font-extrabold">دوره‌ای برای نمایش نیست</h2>
            <p className="text-sm leading-7 text-dena-muted">
              دوره پس از ثبت درخواست نظارت یا انتقال مالکیت به مؤسسه در این فهرست ظاهر می‌شود.
            </p>
            <Link href="/institute/providers" className={buttonClassName()}>
              رفتن به صف نظارت
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {result.courses.map((course) => (
              <li key={course.courseId}>
                <Card className="h-full space-y-3 p-6">
                  <h2 className="text-lg font-extrabold leading-8">{course.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-dena-muted">
                    {course.providerName && <>
                      <span>{course.providerName}</span>
                      {course.providerCollaborationApproved && <VerificationBadge kind="provider" />}
                    </>}
                    {course.ownerType === "independent_educator" && course.independentEducatorName && <>
                      <span>{course.independentEducatorName}</span>
                      <VerificationBadge kind="independent-educator" />
                    </>}
                    {course.ownerType === "institute" && <span>مالک دوره: مؤسسه</span>}
                    <span>{course.instituteName}</span>
                    <VerificationBadge kind="institute" />
                  </div>
                  <p className="text-sm font-semibold">
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
                  <Link href={`/institute/courses/${course.courseId}`}
                    className={buttonClassName()}>
                    جزئیات همین دوره
                  </Link>
                  {course.supervisionStatus === "requested" && (
                    <Link href="/institute/providers" className={buttonClassName("secondary")}>
                      رفتن به صف تصمیم نظارت
                    </Link>
                  )}
                  {course.supervisionStatus === "approved" && (
                    <Link href={`/institute/courses/${course.courseId}/assessments`}
                      className={buttonClassName("secondary")}>
                      بازبینی ارزیابی‌های یادگیری
                    </Link>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی دوره‌ها">
          {cursor && (
            <Link href="/institute/courses" className={buttonClassName("secondary")}>
              صفحهٔ نخست
            </Link>
          )}
          {result.nextCursor && (
            <Link href={`/institute/courses?cursor=${encodeURIComponent(result.nextCursor)}`}
              className={buttonClassName("secondary")}>
              دوره‌های بعدی
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
