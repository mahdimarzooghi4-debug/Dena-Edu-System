"use client";

import { useState } from "react";

type PracticeQuestion = {
  questionId: string;
  topicId: string;
  topicTitle: string;
  prompt: string;
  options: string[];
  guidedHint: string | null;
};
type PracticeResult = {
  correct: boolean;
  explanation: string;
  resultRecorded: boolean;
};

export function AiTutorPractice({ courseId, enabled, onOutcomeSaved }: {
  courseId: string;
  enabled: boolean;
  onOutcomeSaved: (topicId: string, correct: boolean) => void;
}) {
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [rememberResult, setRememberResult] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadQuestion() {
    if (!courseId || busy) return;
    setBusy(true);
    setError("");
    setQuestion(null);
    setResult(null);
    setSelectedOption(null);
    try {
      const response = await fetch(
        "/api/student/ai-tutor/practice?courseId=" + encodeURIComponent(courseId),
        { credentials: "same-origin", cache: "no-store" },
      );
      const data = await response.json() as PracticeQuestion & { error?: string };
      if (!response.ok) {
        setError(data.error === "No saved topic"
          ? "برای پیشنهاد تمرین، اول یک موضوع را با گزینهٔ اختیاری ثبت کن."
          : "تمرین فعلاً در دسترس نیست.");
        return;
      }
      setQuestion(data);
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!question || selectedOption === null || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student/ai-tutor/practice", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          questionId: question.questionId,
          selectedOption,
          rememberResult,
        }),
      });
      const data = await response.json() as PracticeResult & { error?: string };
      if (!response.ok) {
        setError("دسترسی یا تمرین تغییر کرده است؛ تمرین را دوباره بگیر.");
        setQuestion(null);
        return;
      }
      setResult(data);
      if (data.resultRecorded && question) onOutcomeSaved(question.topicId, data.correct);
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;
  return (
    <section className="space-y-3 rounded-xl bg-dena-bg p-4" aria-labelledby="tutor-practice-title">
      <div>
        <h3 id="tutor-practice-title" className="font-bold text-dena-ink">تمرین پیشنهادی برای موضوع ثبت‌شده</h3>
        <p className="mt-1 text-xs leading-6 text-dena-muted">
          نتیجه فقط وقتی ذخیره می‌شود که خودت گزینهٔ جداگانهٔ ثبت را روشن کنی؛ این تمرین نمره نیست.
        </p>
      </div>
      {!question && (
        <button type="button" disabled={busy || !courseId}
          onClick={() => void loadQuestion()}
          className="rounded-xl border border-dena-line bg-white px-4 py-2 text-sm font-bold text-dena-brand disabled:opacity-50">
          {busy ? "در حال آماده‌سازی…" : "گرفتن یک تمرین کوتاه"}
        </button>
      )}
      {question && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-dena-brand">{question.topicTitle}</p>
          {question.guidedHint && (
            <p className="rounded-lg bg-white p-3 text-sm leading-7 text-dena-muted">
              راهنمای مرحله‌ای بر اساس نتیجه‌هایی که قبلاً ذخیره کردی: {question.guidedHint}
            </p>
          )}
          <p className="text-sm font-bold leading-7 text-dena-ink">{question.prompt}</p>
          <fieldset className="space-y-2">
            <legend className="sr-only">گزینهٔ پاسخ</legend>
            {question.options.map((option, index) => (
              <label key={option} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm">
                <input type="radio" name="tutor-practice-option" checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)} />
                {option}
              </label>
            ))}
          </fieldset>
          {!result && (
            <>
              <label className="flex items-start gap-2 text-xs leading-6 text-dena-muted">
                <input type="checkbox" checked={rememberResult}
                  onChange={(event) => setRememberResult(event.target.checked)}
                  className="mt-1 size-4 accent-dena-brand" />
                <span>ذخیرهٔ شمارندهٔ پاسخ درست/نادرست برای راهنمایی‌های بعدی. متن پاسخ یا گزینهٔ انتخابی ذخیره نمی‌شود.</span>
              </label>
              <button type="button" disabled={busy || selectedOption === null}
                onClick={() => void submitAnswer()}
                className="rounded-xl bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "در حال بررسی…" : "بررسی پاسخ"}
              </button>
            </>
          )}
          {result && (
            <div role="status" aria-live="polite" className="rounded-lg bg-white p-3 text-sm leading-7">
              <p className="font-bold">{result.correct ? "درست است." : "این بار درست نشد."}</p>
              <p>{result.explanation}</p>
              {result.resultRecorded && <p className="mt-2 text-xs text-dena-muted">شمارندهٔ نتیجه ذخیره شد؛ هر زمان می‌توانی کل مسیر شخصی را پاک کنی.</p>}
              <button type="button" className="mt-2 text-sm font-bold text-dena-brand underline"
                onClick={() => { setQuestion(null); setResult(null); setSelectedOption(null); }}>
                تمرین دیگری بگیر
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p role="status" className="text-sm text-dena-muted">{error}</p>}
    </section>
  );
}
