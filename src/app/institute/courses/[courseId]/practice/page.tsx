import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../components/ui/card";
import { InstitutePracticeReview } from "../../../../../components/institute/practice-review";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getInstitutePractice } from "../../../../../server/student/course-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "بررسی تمرین دوره | دنا",
  robots: { index: false, follow: false },
};

const statusLabel = {
  pending: "در انتظار تصمیم مؤسسه",
  approved: "تأییدشده برای نمایش به دانش‌آموز",
  rejected: "ردشده و پنهان از دانش‌آموز",
} as const;

export default async function InstitutePracticePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const state = await getInstitutePractice(actor.userId, courseId);
  if (!state) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-3xl space-y-6 px-5 py-8 md:py-14">
      <Link href="/institute"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به خانه مؤسسه
      </Link>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <div className="space-y-3">
          <p className="text-sm font-bold text-dena-brand">
            بازبینی مستقل تمرین دوره
          </p>
          <h1 className="text-2xl font-extrabold leading-10">
            {state.title}
          </h1>
          <p className="text-sm leading-8 text-dena-muted">
            تأیید نظارت خود دوره به‌تنهایی این سؤال را برای دانش‌آموز فعال
            نمی‌کند. تصمیم این صفحه فقط دربارهٔ همین تمرین است و
            آزمون رسمی، نمرهٔ مدرسه یا مجوز آموزشی ایجاد نمی‌کند.
          </p>
        </div>
        {!state.question ? (
          <p className="rounded-xl bg-dena-bg p-5 text-sm leading-8 text-dena-muted">
            ارائه‌دهنده هنوز سؤال تمرینی برای این دوره ثبت نکرده است.
          </p>
        ) : (
          <section className="space-y-5">
            <div className="space-y-4 rounded-xl bg-dena-bg p-5">
              <p className="text-sm font-bold">
                وضعیت: {statusLabel[state.question.reviewStatus]}
              </p>
              <h2 className="font-extrabold leading-8">
                {state.question.prompt}
              </h2>
              <ol className="list-inside list-decimal space-y-2 text-sm leading-7">
                {state.question.options.map((option, index) => (
                  <li key={index}>
                    {option}
                    {index === state.question!.correctOption
                      ? " — پاسخ درست اعلام‌شده توسط ارائه‌دهنده" : ""}
                  </li>
                ))}
              </ol>
              {state.question.reviewReason && (
                <p className="text-sm leading-7 text-dena-muted">
                  دلیل تصمیم ثبت‌شده: {state.question.reviewReason}
                </p>
              )}
            </div>
            {state.question.reviewStatus === "pending" &&
              state.publicationStatus === "draft" && (
                <InstitutePracticeReview courseId={state.courseId} />
              )}
            {state.question.reviewStatus === "pending" &&
              state.publicationStatus !== "draft" && (
                <p className="text-sm leading-8 text-dena-muted">
                  دوره دیگر در وضعیت پیش‌نویس نیست؛ تصمیم تازه از این
                  مسیر ثبت نمی‌شود.
                </p>
              )}
          </section>
        )}
      </Card>
    </main>
  );
}
