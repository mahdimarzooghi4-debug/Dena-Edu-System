"use client";

import { useState } from "react";
import { Button } from "../ui/button";

type Attempt = { selectedOption: number; correct: boolean; submittedAt: string };
type Question = {
  courseId: string; prompt: string; options: string[];
  attempt: Attempt | null;
};

/** One optional formative attempt. Answer key never crosses student boundary. */
export function StudentCoursePractice({
  courseId, question,
}: { courseId: string; question: Question }) {
  const [attempt, setAttempt] = useState(question.attempt);
  const [selected, setSelected] = useState<number | null>(
    question.attempt?.selectedOption ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (busy || selected === null || attempt) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(
        `/api/student/courses/${courseId}/practice`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedOption: selected }),
        },
      );
      if (!response.ok) {
        setMessage(response.status === 404 || response.status === 401
          ? "دسترسی یا وضعیت دوره تغییر کرده است؛ دوباره بررسی کنید."
          : "ثبت پاسخ ممکن نشد؛ دوباره تلاش کنید.");
        return;
      }
      const data = await response.json() as {
        selectedOption: number; correct: boolean; submittedAt: string;
      };
      setAttempt({
        selectedOption: data.selectedOption,
        correct: data.correct,
        submittedAt: data.submittedAt,
      });
      setSelected(data.selectedOption);
      setMessage("پاسخ شخصی در پایگاه داده ثبت شد.");
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally { setBusy(false); }
  }
  return (
    <section className="space-y-5 rounded-xl border border-dena-border p-5"
      aria-labelledby="course-practice-heading">
      <h2 id="course-practice-heading"
        className="text-lg font-extrabold leading-9">
        تمرین کوتاه این دوره
      </h2>
      <p className="text-sm leading-8 text-dena-muted">
        یک سؤال چهارگزینه‌ایِ ارائه‌دهنده، تنها با یک فرصت پاسخ.
        این سؤال پس از بازبینی مستقل مؤسسهٔ مسئول برای نمایش فعال شده
        است؛ آزمون رسمی، مدرک یا اثبات تماشای ویدئو نیست.
      </p>
      <fieldset className="space-y-3" disabled={Boolean(attempt) || busy}>
        <legend className="mb-3 font-bold leading-8">{question.prompt}</legend>
        {question.options.map((option, index) => (
          <label key={index} className="flex items-start gap-3 rounded-xl bg-dena-bg p-3 text-sm leading-8">
            <input type="radio" name={`practice-${courseId}`}
              checked={selected === index}
              onChange={() => setSelected(index)}
              className="mt-2 h-5 w-5 accent-dena-brand" />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      {attempt ? (
        <p role="status" className="rounded-xl bg-dena-bg p-4 text-sm leading-8">
          پاسخ تو ثبت شده است: گزینهٔ{" "}
          {(attempt.selectedOption + 1).toLocaleString("fa-IR")}.
          {" "}{attempt.correct ? "پاسخ این تمرین درست بود." :
            "پاسخ این تمرین درست نبود."}
          {" "}پاسخ دوباره در این نسخه فعال نیست.
        </p>
      ) : (
        <Button type="button" disabled={busy || selected === null}
          onClick={() => void submit()} className="disabled:opacity-50">
          {busy ? "در حال ثبت پاسخ…" : "ثبت نهایی پاسخ تمرین"}
        </Button>
      )}
      <div role="status" aria-live="polite" className="text-sm leading-8">
        {message && <p className="text-dena-deep">{message}</p>}
      </div>
    </section>
  );
}
