"use client";

import { useState } from "react";

type Props = {
  id: string;
  title: string;
  question: string;
  choices: readonly string[];
};

export function DemoPractice({ id, title, question, choices }: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (choice === null) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/student/demo/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ assessmentId: id, choice }),
      });
      if (!response.ok) throw new Error("Demo API unavailable");
      const body: { correct: boolean; explanation: string; mode: string; stored: boolean } = await response.json();
      if (body.mode !== "synthetic" || body.stored !== false) throw new Error("Unexpected response");
      setResult(body);
    } catch {
      setError("ارتباط با بک‌اند آزمایشی برقرار نشد. دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-[20px] border border-dena-border bg-white p-5">
      <div>
        <p className="text-xs font-bold text-dena-brand">تمرین نمونه · بدون ثبت نمره</p>
        <h3 className="mt-2 text-lg font-extrabold text-dena-deep">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-dena-ink">{question}</p>
      </div>
      <fieldset disabled={!!result || busy} className="space-y-2">
        <legend className="sr-only">گزینه پاسخ</legend>
        {choices.map((answer, index) => (
          <label key={answer} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dena-border px-4 py-3 text-sm has-[:checked]:border-dena-brand has-[:checked]:bg-dena-lavender">
            <input type="radio" name={id} checked={choice === index} onChange={() => setChoice(index)} />
            <span>{answer}</span>
          </label>
        ))}
      </fieldset>
      {result && <div role="status" className="rounded-xl bg-dena-lavender p-4 text-sm leading-7">
        <strong>{result.correct ? "پاسخ درست است." : "این پاسخ درست نیست."}</strong>
        <p>{result.explanation}</p>
        <p className="text-xs text-dena-muted">نتیجه فقط در این صفحه نمایش داده شده و ذخیره نشده است.</p>
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {result ? (
        <button type="button" onClick={() => {setResult(null); setChoice(null);}} className="rounded-xl border border-dena-brand px-5 py-3 text-sm font-bold text-dena-brand">تلاش دوباره</button>
      ) : (
        <button type="button" disabled={choice === null || busy} onClick={() => void submit()} className="rounded-xl bg-dena-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "در حال بررسی..." : "بررسی پاسخ در بک‌اند آزمایشی"}
        </button>
      )}
    </section>
  );
}
