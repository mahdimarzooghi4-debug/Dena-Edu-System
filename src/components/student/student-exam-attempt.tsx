"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";

type Question = {
  id: string; prompt: string; option0: string; option1: string;
  option2: string; option3: string; position: number;
  selectedOption: number | null;
};
type Attempt = {
  id: string; status: "in_progress" | "submitted" | "expired";
  deadlineAt: Date; questions: Question[];
  correctCount?: number | null; totalPoints?: number | null; earnedPoints?: number | null;
};

export function StudentExamAttempt({ examId, attempt }: { examId: string; attempt: Attempt }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(attempt.questions.flatMap((question) =>
      question.selectedOption === null ? [] : [[question.id, question.selectedOption]],
    )));
  const [seconds, setSeconds] = useState(() => Math.max(
    0, Math.floor((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000),
  ));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const result = attempt.status !== "in_progress";
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => setSeconds(Math.max(0,
      Math.floor((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000),
    )), 1000);
    return () => window.clearInterval(timer);
  }, [attempt.deadlineAt, result]);

  useEffect(() => {
    if (seconds === 0 && !result && !submitting && !saving) void submit(true);
    // The deadline, not local state, is the authority for final submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, result, submitting, saving]);

  async function choose(questionId: string, selectedOption: number) {
    if (saving || submitting || result || seconds === 0) return;
    setSaving(true); setMessage("");
    const next = { ...answers, [questionId]: selectedOption };
    try {
      const response = await fetch("/api/student/exams/" + encodeURIComponent(examId) +
        "/attempts/" + encodeURIComponent(attempt.id) + "/answers", {
        method: "PATCH", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: [{ questionId, selectedOption }] }),
      });
      if (!response.ok) {
        setMessage("ذخیرهٔ پاسخ انجام نشد؛ اتصال را بررسی کنید.");
        router.refresh();
        return;
      }
      setAnswers(next);
    } catch {
      setMessage("پاسخ ذخیره نشد؛ دوباره انتخاب کنید.");
    } finally { setSaving(false); }
  }

  async function submit(expired = false) {
    if (submitting || result) return;
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/student/exams/" + encodeURIComponent(examId) +
        "/attempts/" + encodeURIComponent(attempt.id), {
        method: "POST", credentials: "same-origin", cache: "no-store",
      });
      if (!response.ok) throw new Error("submit_failed");
      router.refresh();
      setMessage(expired ? "زمان آزمون به پایان رسید؛ پاسخ‌های ذخیره‌شده ثبت شدند." : "پاسخ‌ها ثبت شدند.");
    } catch {
      setMessage("ثبت نهایی انجام نشد؛ دوباره تلاش کنید.");
      setSubmitting(false);
    }
  }

  if (result) return <section aria-live="polite" className="rounded-2xl border border-dena-border bg-white p-6">
    <p className="text-sm font-bold text-dena-brand">{attempt.status === "expired" ? "زمان آزمون به پایان رسید" : "آزمون ثبت شد"}</p>
    <h2 className="mt-2 text-xl font-extrabold text-dena-deep">نتیجهٔ شما</h2>
    <p className="mt-3 text-lg">{attempt.earnedPoints ?? 0} از {attempt.totalPoints ?? attempt.questions.length} امتیاز</p>
    <p className="mt-2 text-sm text-dena-muted">تعداد پاسخ درست: {attempt.correctCount ?? 0}</p>
  </section>;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-5">
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dena-border bg-white/95 p-4 shadow-sm">
      <p className="font-extrabold text-dena-deep" aria-live="polite">
        زمان باقی‌مانده: {String(minutes).padStart(2, "0")}:{String(remainder).padStart(2, "0")}
      </p><p className="text-sm text-dena-muted">{answeredCount} از {attempt.questions.length} پاسخ ذخیره شد</p>
    </div>
    {attempt.questions.map((question, index) => {
      const options = [question.option0, question.option1, question.option2, question.option3];
      return <fieldset key={question.id} className="space-y-3 rounded-2xl border border-dena-border bg-white p-5">
        <legend className="font-extrabold leading-7 text-dena-deep">
          سؤال {(index + 1).toLocaleString("fa-IR")} — {question.prompt}
        </legend>
        {options.map((option, optionIndex) => <label key={optionIndex}
          className={"flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-6 " +
            (answers[question.id] === optionIndex ? "border-dena-brand bg-dena-lavender" : "border-dena-border")}>
          <input type="radio" name={question.id} checked={answers[question.id] === optionIndex}
            disabled={saving || submitting || seconds === 0}
            onChange={() => void choose(question.id, optionIndex)} className="mt-1 accent-dena-brand" />
          <span>{option}</span>
        </label>)}
      </fieldset>;
    })}
    <Button type="submit" disabled={saving || submitting}>
      {submitting ? "در حال ثبت…" : "ثبت نهایی پاسخ‌ها"}
    </Button>
    {message && <p role="status" className="text-sm text-dena-deep">{message}</p>}
  </form>;
}
