"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";

export type StudentExamCardData = {
  id: string; title: string; instructions: string; startsAt: Date; endsAt: Date;
  durationMinutes: number; attemptLimit: number; status: string;
  examType: "institute_planned" | "dena_coordinated"; courseTitle: string | null;
  questionCount: number; attemptNumber: number | null;
  attemptStatus: "in_progress" | "submitted" | "expired" | null;
  attemptId: string | null; correctCount: number | null;
  totalPoints: number | null; earnedPoints: number | null; canStart: boolean;
};
const displayDate = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);
const attemptHref = (examId: string, attemptId: string) =>
  "/student/exams/" + encodeURIComponent(examId) + "/attempt/" + encodeURIComponent(attemptId);

export function StudentExamCard({ exam }: { exam: StudentExamCardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/student/exams/" + encodeURIComponent(exam.id) + "/attempts", {
        method: "POST", credentials: "same-origin", cache: "no-store",
      });
      const result = await response.json() as { attemptId?: string; error?: string };
      if (!response.ok || !result.attemptId) {
        setMessage(result.error === "outside_schedule"
          ? "زمان شرکت در آزمون به پایان رسیده است."
          : "شروع آزمون ممکن نشد؛ دسترسی و زمان‌بندی را بررسی کنید.");
        return;
      }
      router.push("/student/exams/" + encodeURIComponent(exam.id) +
        "/attempt/" + encodeURIComponent(result.attemptId));
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally { setBusy(false); }
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
    {exam.attemptId ? (
      <Link href={attemptHref(exam.id, exam.attemptId)}
        className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-4 text-sm font-bold text-white hover:bg-dena-deep">
        ادامهٔ آزمون
      </Link>
    ) : exam.canStart ? <Button disabled={busy} onClick={() => void start()}>
      {busy ? "در حال ورود…" : exam.attemptNumber ? "شروع تلاش بعدی" : "شروع آزمون"}
    </Button> : <p className="text-xs text-dena-muted">
      {exam.status !== "published" ? "این آزمون در حال حاضر منتشر نیست." :
        exam.attemptNumber !== null && exam.attemptNumber >= exam.attemptLimit
          ? "دفعات مجاز شما به پایان رسیده است."
          : new Date() < exam.startsAt ? "آزمون هنوز شروع نشده است." : "بازهٔ شرکت در آزمون بسته شده است."}
    </p>}
    {message && <p role="status" className="text-sm text-red-700">{message}</p>}
  </article>;
}
