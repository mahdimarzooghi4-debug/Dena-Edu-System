"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { DENA_LEARNING_CONCEPTS } from "../../server/ai-tutor/learning-concepts";

export function PracticeAuthor({
  courseId,
}: { courseId: string }) {
  const [prompt, setPrompt] = useState("");
  const [learningConceptId, setLearningConceptId] = useState<string>(
    DENA_LEARNING_CONCEPTS[0].id,
  );
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || correctOption === null || created) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(
        `/api/provider/courses/${courseId}/practice`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learningConceptId, prompt, options, correctOption }),
        },
      );
      if (!response.ok) {
        setMessage(response.status === 409
          ? "برای این دوره قبلاً یک سؤال ثبت شده است. متن و پاسخ آن قابل تغییر نیست."
          : response.status === 404
            ? "پیش‌نویس دوره یا نظارت آن دیگر برای ثبت سؤال معتبر نیست."
            : response.status === 400
              ? "صورت سؤال و چهار گزینهٔ غیرتکراری را در محدودهٔ مجاز وارد کنید."
              : "ثبت تمرین انجام نشد؛ دوباره تلاش کنید.");
        return;
      }
      setCreated(true);
      setMessage("سؤال تمرینی در پایگاه داده ثبت شد و دیگر قابل ویرایش نیست.");
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  if (created) return <p role="status"
    className="rounded-xl bg-dena-bg p-5 text-sm leading-8">
    {message}
  </p>;
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="practice-learning-concept" className="block font-bold">
          مبحث آموزشی مرتبط با ویدئو
        </label>
        <select id="practice-learning-concept" required value={learningConceptId}
          onChange={(event) => setLearningConceptId(event.target.value)}
          className="w-full rounded-xl border border-dena-border bg-white p-3 text-sm">
          {DENA_LEARNING_CONCEPTS.map((concept) => (
            <option key={concept.id} value={concept.id}>{concept.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="practice-question" className="block font-bold">
          متن پرسش کوتاه
        </label>
        <textarea id="practice-question" required minLength={10}
          maxLength={500} rows={3} value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="w-full rounded-xl border border-dena-border p-3 text-sm leading-8"
          placeholder="پرسشی مرتبط با محتوای این دوره بنویسید." />
      </div>
      <fieldset className="space-y-3">
        <legend className="font-bold">چهار گزینه و پاسخ درست</legend>
        {options.map((value, index) => (
          <div key={index} className="flex items-center gap-3">
            <input type="radio" name="correct-option" required
              aria-label={`گزینهٔ ${(index + 1).toLocaleString("fa-IR")} پاسخ درست است`}
              checked={correctOption === index}
              onChange={() => setCorrectOption(index)}
              className="h-5 w-5 accent-dena-brand" />
            <label className="flex-1 space-y-1 text-sm">
              <span className="block">گزینهٔ {(index + 1).toLocaleString("fa-IR")}</span>
              <input type="text" required maxLength={160} value={value}
                onChange={(event) => setOptions((current) =>
                  current.map((item, i) => i === index
                    ? event.target.value : item))}
                className="w-full rounded-xl border border-dena-border p-3" />
            </label>
          </div>
        ))}
      </fieldset>
      <p className="text-sm leading-8 text-dena-muted">
        در این فاز تنها یک سؤال چهارگزینه‌ای برای هر دوره ثبت می‌شود.
        بعد از ثبت، سؤال و کلید پاسخ تغییر نمی‌کند. این تمرین به‌صورت
        مؤسسه پیش از نمایش به دانش‌آموز مستقلاً سؤال و کلید پاسخ را بازبینی می‌کند.
        این تمرین آزمون رسمی نیست.
      </p>
      <Button type="submit" disabled={busy || correctOption === null}
        className="disabled:opacity-50">
        {busy ? "در حال ثبت…" : "ثبت نهایی سؤال تمرینی"}
      </Button>
      <div role="status" aria-live="polite" className="text-sm leading-8">
        {message && <p className="text-dena-deep">{message}</p>}
      </div>
    </form>
  );
}
