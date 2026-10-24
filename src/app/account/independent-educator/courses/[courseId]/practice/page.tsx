import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../../components/ui/card";
import { PracticeAuthor } from "../../../../../../components/provider/practice-author";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { getIndependentEducatorPractice } from "../../../../../../server/student/course-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تمرین کوتاه دوره | دنا", robots: { index: false, follow: false },
};

export default async function IndependentEducatorPracticePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const state = await getIndependentEducatorPractice(actor.userId, courseId);
  if (!state) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl space-y-6 px-5 py-8 md:py-14">
      <Link href="/account/independent-educator"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به فضای همکار مستقل
      </Link>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">تمرین کوتاه همکار مستقل</p>
        <h1 className="text-2xl font-extrabold leading-10">تمرین کوتاه: {state.title}</h1>
        <p className="text-sm leading-8 text-dena-muted">
          این سؤال جدا از تأیید نظارت دوره، توسط مؤسسهٔ ناظر بازبینی می‌شود و تا آن زمان به دانش‌آموز نمایش داده نمی‌شود. تمرین، آزمون رسمی یا نمرهٔ مدرسه نیست.
        </p>
        {state.question ? (
          <section className="space-y-4 rounded-xl bg-dena-bg p-5">
            <h2 className="font-extrabold">{state.question.prompt}</h2>
            <ol className="list-inside list-decimal space-y-2 text-sm">
              {state.question.options.map((option, index) => (
                <li key={index}>{option}{index === state.question!.correctOption
                  ? " — پاسخ درست ثبت‌شده" : ""}</li>
              ))}
            </ol>
            <p className="text-sm text-dena-muted">
              وضعیت بازبینی مؤسسه: {state.question.reviewStatus === "pending"
                ? "در انتظار تصمیم مستقل مؤسسه"
                : state.question.reviewStatus === "approved"
                  ? "تأییدشده برای نمایش به دانش‌آموز"
                  : "ردشده و از دانش‌آموز پنهان"}
            </p>
            {state.question.reviewReason && <p className="text-sm leading-7 text-dena-muted">
              دلیل تصمیم مؤسسه: {state.question.reviewReason}
            </p>}
            <p className="text-sm text-dena-muted">سؤال نهایی شده است و در نسخهٔ آزمایشی قابل تغییر نیست.</p>
          </section>
        ) : state.publicationStatus === "draft" ? (
          <PracticeAuthor courseId={state.courseId}
            apiPath={`/api/independent-educator/courses/${state.courseId}/practice`} />
        ) : (
          <p className="rounded-xl bg-dena-bg p-5 text-sm leading-8">
            ثبت سؤال جدید فقط پیش از انتشار دوره امکان دارد.
          </p>
        )}
      </Card>
    </main>
  );
}
