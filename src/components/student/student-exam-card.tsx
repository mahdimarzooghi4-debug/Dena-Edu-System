"use client";

import Link from "next/link";

export type StudentExamCardData = {
  id: string; title: string; instructions: string; startsAt: Date; endsAt: Date;
  durationMinutes: number; attemptLimit: number; status: string;
  examType: "institute_planned" | "dena_coordinated"; courseId: string | null; courseTitle: string | null;
  questionCount: number; attemptNumber: number | null;
  attemptStatus: "in_progress" | "submitted" | "expired" | null;
  attemptId: string | null; correctCount: number | null;
  totalPoints: number | null; earnedPoints: number | null; canStart: boolean;
};
const displayDate = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);
const suggestedDate = (value: Date) => {
  const day = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeZone: "Asia/Tehran" });
  return day.format(value) === day.format(new Date()) ? "امروز" :
    new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(value);
};
const attemptHref = (examId: string, attemptId: string) =>
  "/student/exams/" + encodeURIComponent(examId) + "/attempt/" + encodeURIComponent(attemptId);

export function StudentExamCard({
  exam, featured = false,
}: { exam: StudentExamCardData; featured?: boolean }) {
  const action = exam.attemptId ? (
    <Link href={attemptHref(exam.id, exam.attemptId)}
      className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-4 text-sm font-bold text-white hover:bg-dena-deep">
      ادامهٔ آزمون
    </Link>
  ) : (
    <Link href={"/student/exams/" + encodeURIComponent(exam.id)}
      className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-4 text-sm font-bold text-white hover:bg-dena-deep">
      مشاهده جزئیات و {exam.attemptNumber ? "شروع تلاش بعدی" : "شروع آزمون"}
    </Link>
  );

  if (featured) {
    const state = exam.attemptStatus === "in_progress" ? "در حال انجام" :
      exam.attemptStatus === "submitted" ? "انجام‌شده" :
        exam.attemptStatus === "expired" ? "نیاز به پیگیری" :
          exam.canStart ? "آماده انجام" : "در انتظار";
    return <article className="space-y-4 rounded-[22px] border border-dena-border bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-dena-muted">دوره مرتبط</p>
          <p className="mt-1 text-sm font-bold text-dena-deep">{exam.courseTitle ?? "آزمون هماهنگ دنا"}</p>
        </div>
        <span className="rounded-full bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">{state}</span>
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-dena-deep">{exam.title}</h3>
        <p className="mt-2 text-sm text-dena-muted">زمان پیشنهادی: {suggestedDate(exam.startsAt)}</p>
      </div>
      {action ?? <p className="text-xs leading-6 text-dena-muted">
        {exam.status !== "published" ? "این آزمون در حال حاضر منتشر نیست." :
          exam.attemptNumber !== null && exam.attemptNumber >= exam.attemptLimit
            ? "دفعات مجاز شما به پایان رسیده است."
            : new Date() < exam.startsAt ? "آزمون هنوز شروع نشده است." : "بازهٔ شرکت در آزمون بسته شده است."}
      </p>}
    </article>;
  }

  return <article className="space-y-3 rounded-2xl border border-dena-border bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold text-dena-brand">
        {exam.examType === "dena_coordinated" ? "آزمون هماهنگ دنا" : "آزمون مؤسسه · " + exam.courseTitle}
      </p><h3 className="mt-1 font-extrabold text-dena-deep">{exam.title}</h3></div>
      <span className="rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">
        {exam.attemptStatus === "in_progress" ? "در حال انجام" :
          exam.attemptStatus === "submitted" ? "ثبت‌شده" :
            exam.attemptStatus === "expired" ? "زمان به پایان رسید" : "آماده‌سازی"}
      </span>
    </div>
    <p className="text-sm leading-7 text-dena-muted">
      {displayDate(exam.startsAt)} تا {displayDate(exam.endsAt)} · {exam.durationMinutes} دقیقه ·
      {" "}{exam.questionCount} سؤال · تا {exam.attemptLimit} بار
    </p>
    {exam.attemptStatus && exam.attemptStatus !== "in_progress" && exam.earnedPoints !== null && (
      <p className="text-sm font-semibold text-dena-deep">
        نتیجهٔ آخرین تلاش: {exam.earnedPoints} از {exam.totalPoints ?? exam.questionCount} امتیاز
      </p>
    )}
    {action ?? <p className="text-xs text-dena-muted">
      {exam.status !== "published" ? "این آزمون در حال حاضر منتشر نیست." :
        exam.attemptNumber !== null && exam.attemptNumber >= exam.attemptLimit
          ? "دفعات مجاز شما به پایان رسیده است."
          : new Date() < exam.startsAt ? "آزمون هنوز شروع نشده است." : "بازهٔ شرکت در آزمون بسته شده است."}
    </p>}
  </article>;
}
