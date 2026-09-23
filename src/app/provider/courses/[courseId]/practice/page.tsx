import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../components/ui/card";
import { PracticeAuthor } from "../../../../../components/provider/practice-author";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getProviderPractice } from "../../../../../server/student/course-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تمرین دوره | دنا",
  robots: { index: false, follow: false },
};

export default async function ProviderPracticePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const state = await getProviderPractice(actor.userId, courseId);
  if (!state) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-3xl space-y-6 px-5 py-8 md:py-14">
      <Link href="/provider"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به دوره‌های ارائه‌دهنده
      </Link>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">
          سؤال تمرینی ارائه‌دهنده
        </p>
        <h1 className="text-2xl font-extrabold leading-10">
          تمرین کوتاه: {state.title}
        </h1>
        <p className="text-sm leading-8 text-dena-muted">
          نظارت مؤسسه مربوط به خود دوره است و متن این سؤال، بازبینی
          مستقل آموزشی ندارد. این سؤال آزمون رسمی، نمرهٔ مدرسه یا مدرک نیست.
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
              سؤال نهایی شده است؛ تغییر و حذف در نسخهٔ آزمایشی فعال نیست.
            </p>
          </section>
        ) : state.publicationStatus === "draft" ? (
          <PracticeAuthor courseId={state.courseId} />
        ) : (
          <p className="rounded-xl bg-dena-bg p-5 text-sm leading-8">
            ثبت سؤال جدید فقط پیش از انتشارِ دوره امکان دارد.
            این دوره اکنون پیش‌نویس نیست.
          </p>
        )}
      </Card>
    </main>
  );
}
