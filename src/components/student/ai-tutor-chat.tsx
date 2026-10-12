"use client";

import { useState } from "react";

type Course = { courseId: string; title: string };
type TutorResponse = {
  answer?: string;
  source?: { title: string; corpusVersion: string };
  error?: string;
  code?: string;
};

export function AiTutorChat({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.courseId ?? "");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TutorResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/student/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, message }),
      });
      setResult(await response.json() as TutorResponse);
    } catch {
      setResult({ error: "ارتباط برقرار نشد؛ دوباره تلاش کن." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-dena-line bg-white p-5" aria-labelledby="tutor-chat-title">
      <div>
        <h2 id="tutor-chat-title" className="text-lg font-extrabold text-dena-deep">گفت‌وگو با معلم دنا</h2>
        <p className="mt-1 text-sm leading-7 text-dena-muted">
          پاسخ‌ها فعلاً از مجموعهٔ آموزشی آغازین دنا بازیابی می‌شوند؛ اگر پرسشت در این مجموعه نباشد، پاسخ ساخته نمی‌شود.
        </p>
      </div>
      {courses.length === 0 ? (
        <p className="rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
          برای شروع گفت‌وگو، یک دورهٔ منتشرشده و ثبت‌نام فعال لازم است.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={ask}>
          <label className="block text-sm font-bold text-dena-ink">
            دوره
            <select className="mt-2 block w-full rounded-xl border border-dena-line bg-white p-3" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              {courses.map((course) => <option key={course.courseId} value={course.courseId}>{course.title}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-dena-ink">
            پرسشت
            <textarea className="mt-2 block min-h-24 w-full rounded-xl border border-dena-line p-3 font-normal" required maxLength={3000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="مثلاً: معادلهٔ یک‌مجهولی را چطور حل کنم؟" />
          </label>
          <button className="rounded-xl bg-dena-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !courseId}>
            {busy ? "در حال بررسی…" : "پرسیدن"}
          </button>
        </form>
      )}
      {result && (
        <div aria-live="polite" className="rounded-xl bg-dena-lavender p-4 text-sm leading-8 text-dena-ink">
          {result.answer ? (
            <>
              <p className="whitespace-pre-line">{result.answer}</p>
              <p className="mt-3 border-t border-dena-line pt-2 text-xs text-dena-muted">
                منبع: {result.source?.title} · نسخهٔ مجموعه: {result.source?.corpusVersion}
              </p>
            </>
          ) : <p>{result.error ?? "برای این پرسش هنوز محتوای آموزشی آماده ندارم."}</p>}
        </div>
      )}
    </section>
  );
}
