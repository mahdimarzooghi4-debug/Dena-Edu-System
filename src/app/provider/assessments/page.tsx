import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getProviderAssessmentOverview } from "../../../server/provider/assessment-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ارزیابی‌های ارائه‌دهنده | دنا",
  robots: { index: false, follow: false },
};

const reviewLabels = {
  pending: "در انتظار بررسی مؤسسه",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;

export default async function ProviderAssessmentsPage({
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
  const result = await getProviderAssessmentOverview(providerIds, cursor);
  if (result.invalidCursor) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/provider" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ ارائه‌دهنده
        </Link>
        <Link href="/provider/courses" className={buttonClassName("secondary")}>
          دوره‌های من
        </Link>
      </header>
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">ارزیابی‌های یادگیری</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          ارزیابی‌های دوره‌های من
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          این فهرست وضعیت بررسی مؤسسه و تعداد سؤال‌ها را نشان می‌دهد؛
          متن سؤال، کلید پاسخ و تلاش دانش‌آموزان در آن نمایش داده نمی‌شود.
        </p>
      </section>
      <section aria-labelledby="provider-assessments" className="space-y-4">
        <SectionHeading id="provider-assessments" note="۲۰ ارزیابی در هر صفحه">
          ارزیابی‌ها
        </SectionHeading>
        {result.assessments.length === 0 ? (
          <Card className="space-y-3">
            <h2 className="font-extrabold">ارزیابی‌ای ثبت نشده است</h2>
            <p className="text-sm leading-7 text-dena-muted">
              برای ساخت ارزیابی، دورهٔ دارای نظارت تأییدشده را از فهرست دوره‌ها باز کنید.
            </p>
            <Link href="/provider/courses" className={buttonClassName()}>
              رفتن به دوره‌های من
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {result.assessments.map((assessment) => (
              <li key={assessment.assessmentId}>
                <Card className="h-full space-y-3 p-6">
                  <p className="text-sm text-dena-muted">{assessment.courseTitle}</p>
                  <h2 className="text-lg font-extrabold">{assessment.assessmentTitle}</h2>
                  <p className="text-sm">وضعیت: {reviewLabels[assessment.reviewStatus]}</p>
                  <p className="text-sm text-dena-muted">
                    تعداد سؤال: {assessment.questionCount.toLocaleString("fa-IR")}
                  </p>
                  <Link href={`/provider/courses/${assessment.courseId}/assessments`}
                    className={buttonClassName("secondary")}>
                    مشاهدهٔ ارزیابی‌های این دوره
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی ارزیابی‌ها">
          {cursor && (
            <Link href="/provider/assessments" className={buttonClassName("secondary")}>
              صفحهٔ نخست
            </Link>
          )}
          {result.nextCursor && (
            <Link href={`/provider/assessments?cursor=${encodeURIComponent(result.nextCursor)}`}
              className={buttonClassName("secondary")}>
              ارزیابی‌های بعدی
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
