"use client";

import { useState } from "react";
import Link from "next/link";

type AttemptSummary = {
  attemptNumber: number;
  status: "in_progress" | "submitted";
  outcome: "needs_review" | "completed" | null;
  correctCount: number | null;
  submittedAt: string | null;
};
type Assessment = {
  id: string;
  title: string;
  instructions: string;
  questionCount: number;
  requiredCorrectCount: number;
  attempts: AttemptSummary[];
};
type Attempt = {
  id: string;
  attemptNumber: number;
  status: "in_progress" | "submitted";
  outcome: "needs_review" | "completed" | null;
  correctCount: number | null;
  questionCount: number;
  questions: Array<{
    questionId: string;
    position: number;
    selectedOption: number | null;
    prompt: string;
    options: string[];
  }>;
  missedLessonAssetIds: string[];
};

const button = "rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} bg-dena-brand text-white hover:bg-dena-deep`;
const secondary = `${button} border border-dena-line bg-white text-dena-deep hover:bg-dena-bg`;

export function LearningAssessmentCard({ courseId, assessment }: {
  courseId: string;
  assessment: Assessment;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const [reviewLessons, setReviewLessons] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [result, setResult] = useState<{ outcome: string; correctCount: number | null; questionCount: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/student/courses/${courseId}/assessments/${assessment.id}`;

  async function readAttempt(attemptId: string) {
    const response = await fetch(`${base}/attempts/${attemptId}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "دریافت ارزیابی ممکن نشد.");
    setAttempt(body.attempt.status === "in_progress" ? body.attempt as Attempt : null);
    setAnswers(Object.fromEntries(body.attempt.questions
      .filter((question: Attempt["questions"][number]) => question.selectedOption !== null)
      .map((question: Attempt["questions"][number]) => [question.questionId, question.selectedOption])));
    if (body.attempt.outcome === "needs_review") {
      setReviewAttemptId(attemptId);
      setReviewLessons(body.attempt.missedLessonAssetIds);
      setAcknowledged([]);
      setResult({ outcome: body.attempt.outcome, correctCount: body.attempt.correctCount,
        questionCount: body.attempt.questionCount });
    }
  }

  async function start() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${base}/attempts`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "شروع ارزیابی ممکن نشد.");
      if (body.reviewRequired) {
        setAttempt(null); setResult(null);
        setReviewAttemptId(body.previousAttemptId);
        setReviewLessons(body.outstandingLessonAssetIds);
        setAcknowledged([]);
      } else if (body.completed) {
        setResult({ outcome: "completed", correctCount: null, questionCount: null });
      } else {
        await readAttempt(body.attemptId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در ارتباط با سرور.");
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!attempt) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${base}/attempts/${attempt.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "ثبت پاسخ‌ها ممکن نشد.");
      setResult(body);
      setAttempt(null);
      if (body.outcome === "needs_review") await readAttempt(body.attemptId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در ارتباط با سرور.");
    } finally { setBusy(false); }
  }

  async function acknowledge(assetId: string) {
    if (!reviewAttemptId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${base}/attempts/${reviewAttemptId}/lesson-reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonAssetId: assetId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "ثبت بازبینی درس ممکن نشد.");
      setAcknowledged((current) => [...new Set([...current, assetId])]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در ارتباط با سرور.");
    } finally { setBusy(false); }
  }

  const latest = assessment.attempts.at(-1);
  return (
    <article className="rounded-[22px] border border-dena-line bg-white p-5 shadow-sm md:p-6">
      <p className="text-xs font-bold text-dena-brand">ارزیابی یادگیری</p>
      <h3 className="mt-2 text-lg font-extrabold text-dena-deep">{assessment.title}</h3>
      <p className="mt-2 text-sm leading-7 text-dena-muted">{assessment.instructions}</p>
      <p className="mt-3 text-xs text-dena-muted">
        {assessment.questionCount} پرسش · حدنصاب این ارزیابی: {assessment.requiredCorrectCount} پاسخ درست
      </p>

      {latest?.outcome === "completed" && !reviewAttemptId ? (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          این ارزیابی را با موفقیت تکمیل کرده‌اید. کلید پاسخ نمایش داده نمی‌شود.
        </p>
      ) : latest?.outcome === "needs_review" && !reviewAttemptId && !attempt ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
          برای ادامه، درس‌های مرتبط با پاسخ‌های نیازمند مرور را بازبینی کنید.
        </p>
      ) : null}

      {attempt?.status === "in_progress" && (
        <div className="mt-5 space-y-5">
          {attempt.questions.map((question, index) => (
            <fieldset key={question.questionId} className="rounded-xl bg-dena-bg p-4">
              <legend className="font-bold text-dena-deep">{index + 1}. {question.prompt}</legend>
              <div className="mt-3 grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm">
                    <input type="radio" name={question.questionId} value={optionIndex}
                      checked={answers[question.questionId] === optionIndex}
                      onChange={() => setAnswers((current) => ({ ...current, [question.questionId]: optionIndex }))} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button type="button" className={primary} disabled={busy || Object.keys(answers).length !== attempt.questions.length}
            onClick={submit}>{busy ? "در حال ثبت…" : "ثبت نهایی پاسخ‌ها"}</button>
        </div>
      )}

      {result && !attempt && (
        <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${result.outcome === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {result.outcome === "completed" ? "ارزیابی تکمیل شد." : "نتیجه نیازمند مرور درس است."}
          {result.correctCount !== null && result.questionCount !== null &&
            <> {result.correctCount} از {result.questionCount} پاسخ درست.</>} پاسخ هر پرسش نمایش داده نمی‌شود.
        </p>
      )}

      {reviewLessons.length > 0 && reviewAttemptId && (
        <section className="mt-5 space-y-3 rounded-xl bg-amber-50 p-4" aria-label="بازبینی درس‌های مرتبط">
          <h4 className="font-bold text-amber-950">بازبینی درس‌های مرتبط با پرسش‌های نیازمند مرور</h4>
          <p className="text-sm leading-7 text-amber-950">
            هر ویدئو را باز کنید و پس از مرور، بازبینی را ثبت کنید. این ثبت، تأیید خوداظهاری شماست و اثبات مدت تماشا نیست.
          </p>
          <ul className="space-y-3">
            {reviewLessons.map((assetId) => (
              <li key={assetId} className="flex flex-wrap items-center gap-3">
                <Link className="text-sm font-bold text-dena-brand underline" target="_blank"
                  href={`/student/courses/${courseId}/watch#video-${assetId}`}>رفتن به ویدئوی درس</Link>
                {acknowledged.includes(assetId) ? <span className="text-sm text-emerald-800">بازبینی ثبت شد</span> :
                  <button className={secondary} type="button" disabled={busy}
                    onClick={() => acknowledge(assetId)}>بازبینی کردم</button>}
              </li>
            ))}
          </ul>
          {reviewLessons.every((id) => acknowledged.includes(id)) && (
            <p className="text-sm font-bold text-emerald-800">همه بازبینی‌ها ثبت شدند؛ اکنون می‌توانید تلاش تازه را شروع کنید.</p>
          )}
        </section>
      )}

      {!attempt && !(result?.outcome === "completed") && (
        <button type="button" className={`${primary} mt-5`} disabled={busy ||
          (reviewLessons.length > 0 && !reviewLessons.every((id) => acknowledged.includes(id)))}
          onClick={start}>{busy ? "در حال آماده‌سازی…" : latest?.status === "in_progress" ? "ادامه تلاش" : "شروع / تلاش تازه"}</button>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
    </article>
  );
}
