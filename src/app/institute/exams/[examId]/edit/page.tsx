import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ExamCreationForm } from "../../../../../components/assessments/exam-creation-form";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { examReportQuery, getExamReport } from "../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ویرایش آزمون | دنا",
  robots: { index: false, follow: false },
};

export default async function EditInstituteExamPage({
  params,
}: { params: Promise<{ examId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();
  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  const report = await getExamReport(actor.userId, "institute", examId, examReportQuery.parse({}));
  if (!report || !report.exam.courseId || report.summary.totalAttempts > 0 ||
      report.exam.status === "cancelled" ||
      (report.exam.status === "published" && report.exam.startsAt <= new Date())) notFound();

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f7f6fb]">
      <header className="flex min-h-[72px] items-center justify-between border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <a href={"/institute/exams/" + encodeURIComponent(examId)}
          className="text-sm font-semibold text-[#5b4ce2] hover:underline">بازگشت به آزمون</a>
        <h1 className="text-xl font-bold text-[#1e1a33]">ویرایش آزمون</h1>
      </header>
      <div className="space-y-5 p-5 md:p-8">
        <p className="text-sm leading-7 text-[#6e6a8a]">
          آزمون‌های دارای تلاش ثبت‌شده یا آزمون‌هایی که زمان برگزاری‌شان آغاز شده قابل ویرایش نیستند.
        </p>
        <ExamCreationForm kind="institute" initialExam={{
          id: report.exam.id,
          title: report.exam.title,
          instructions: report.exam.instructions,
          startsAt: report.exam.startsAt.toISOString(),
          endsAt: report.exam.endsAt.toISOString(),
          durationMinutes: report.exam.durationMinutes,
          attemptLimit: report.exam.attemptLimit,
          courseId: report.exam.courseId,
          questionIds: report.questions.map((question) => question.bankQuestionId),
        }} />
      </div>
    </main>
  );
}
