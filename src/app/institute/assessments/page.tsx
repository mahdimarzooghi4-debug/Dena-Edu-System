import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteAssessmentQueue } from "../../../server/institute/assessment-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تمرین‌ها و آزمون‌ها | دنا",
  robots: { index: false, follow: false },
};

export default async function InstituteAssessmentsPage({
  searchParams,
}: { searchParams: Promise<{ practiceCursor?: string; learningCursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const cursors = await searchParams;
  const result = await getInstituteAssessmentQueue(instituteIds, {
    practice: cursors.practiceCursor,
    learning: cursors.learningCursor,
  });
  if (result.invalidCursor) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/institute" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ مؤسسه
        </Link>
        <Link href="/institute/courses" className={buttonClassName("secondary")}>
          دوره‌های مؤسسه
        </Link>
      </header>
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">صف بازبینی مستقل</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          تمرین‌ها و آزمون‌ها
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          فقط موارد در انتظار بررسیِ دوره‌های پیش‌نویس با نظارت تأییدشده در دامنهٔ شما.
          تصمیم نهایی در صفحهٔ همان دوره ثبت می‌شود.
        </p>
      </section>

      <section aria-labelledby="practice-review-queue" className="space-y-4">
        <SectionHeading id="practice-review-queue"
          note={`${result.practicePendingCount.toLocaleString("fa-IR")} مورد در صف`}>
          سؤال‌های تمرینی
        </SectionHeading>
        {result.practice.length === 0 ? (
          <Card><p className="text-sm text-dena-muted">سؤال تمرینی در انتظار بررسی نیست.</p></Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {result.practice.map((item) => (
              <li key={item.id}>
                <Card className="space-y-3 p-5">
                  <h2 className="font-extrabold">{item.courseTitle}</h2>
                  <p className="text-sm text-dena-muted">
                    ثبت: {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium", timeZone: "Asia/Tehran",
                    }).format(item.createdAt)}
                  </p>
                  <Link href={`/institute/courses/${item.courseId}/practice`}
                    className={buttonClassName("secondary")}>
                    بازبینی سؤال این دوره
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی تمرین‌ها">
          {cursors.practiceCursor && (
            <Link href="/institute/assessments" className={buttonClassName("secondary")}>
              صفحهٔ نخست تمرین‌ها
            </Link>
          )}
          {result.nextPracticeCursor && (
            <Link href={`/institute/assessments?practiceCursor=${encodeURIComponent(result.nextPracticeCursor)}${cursors.learningCursor ? `&learningCursor=${encodeURIComponent(cursors.learningCursor)}` : ""}`}
              className={buttonClassName("secondary")}>
              تمرین‌های بعدی
            </Link>
          )}
        </nav>
      </section>

      <section aria-labelledby="learning-review-queue" className="space-y-4">
        <SectionHeading id="learning-review-queue"
          note={`${result.learningPendingCount.toLocaleString("fa-IR")} مورد در صف`}>
          ارزیابی‌های یادگیری
        </SectionHeading>
        {result.learning.length === 0 ? (
          <Card><p className="text-sm text-dena-muted">ارزیابی یادگیری در انتظار بررسی نیست.</p></Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {result.learning.map((item) => (
              <li key={item.id}>
                <Card className="space-y-3 p-5">
                  <p className="text-sm text-dena-muted">{item.courseTitle}</p>
                  <h2 className="font-extrabold">{item.title}</h2>
                  <p className="text-sm text-dena-muted">
                    {item.questionCount.toLocaleString("fa-IR")} سؤال · ثبت: {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium", timeZone: "Asia/Tehran",
                    }).format(item.createdAt)}
                  </p>
                  <Link href={`/institute/courses/${item.courseId}/assessments#assessment-${item.id}`}
                    className={buttonClassName("secondary")}>
                    بازبینی ارزیابی
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی ارزیابی‌ها">
          {cursors.learningCursor && (
            <Link href="/institute/assessments" className={buttonClassName("secondary")}>
              صفحهٔ نخست ارزیابی‌ها
            </Link>
          )}
          {result.nextLearningCursor && (
            <Link href={`/institute/assessments?learningCursor=${encodeURIComponent(result.nextLearningCursor)}${cursors.practiceCursor ? `&practiceCursor=${encodeURIComponent(cursors.practiceCursor)}` : ""}`}
              className={buttonClassName("secondary")}>
              ارزیابی‌های بعدی
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
