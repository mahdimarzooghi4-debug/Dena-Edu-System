"use client";

import { useState, type FormEvent } from "react";
import { AiTutorPractice } from "./ai-tutor-practice";

type Course = { courseId: string; title: string };
type TutorResponse = {
  answer?: string;
  source?: { id: string; title: string; corpusVersion: string };
  error?: string;
  code?: string;
  topicRecorded?: boolean;
};
type Topic = { topicId: string; questionCount: number; lastAskedAt: string; practiceAttemptCount: number; practiceCorrectCount: number };
const topicTitles: Record<string, string> = {
  "math.linear-equation.v1": "معادلهٔ یک‌مجهولی",
  "math.fractions.add.v1": "جمع کسرها",
  "math.percent.v1": "درصد",
};

export function AiTutorChat({ courses, initialTopics }: {
  courses: Course[];
  initialTopics: Topic[];
}) {
  const [courseId, setCourseId] = useState(courses[0]?.courseId ?? "");
  const [message, setMessage] = useState("");
  const [rememberTopic, setRememberTopic] = useState(false);
  const [result, setResult] = useState<TutorResponse | null>(null);
  const [topics, setTopics] = useState(initialTopics);
  const [busy, setBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/student/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, message, rememberTopic }),
      });
      const data = await response.json() as TutorResponse;
      setResult(data);
      if (data.topicRecorded && data.source) {
        const topicId = data.source.id;
        const lastAskedAt = new Date().toISOString();
        setTopics((current) => {
          const existing = current.find((topic) => topic.topicId === topicId);
          if (existing) return current.map((topic) => topic.topicId === topicId
            ? { ...topic, questionCount: Math.min(topic.questionCount + 1, 10000), lastAskedAt }
            : topic);
          return [...current, { topicId, questionCount: 1, lastAskedAt, practiceAttemptCount: 0, practiceCorrectCount: 0 }];
        });
      }
    } catch {
      setResult({ error: "ارتباط برقرار نشد؛ دوباره تلاش کن." });
    } finally {
      setBusy(false);
    }
  }

  async function clearTopics() {
    if (!topics.length || clearBusy ||
        !window.confirm("موضوع‌های ثبت‌شدهٔ مسیر شخصی‌ات پاک شوند؟")) return;
    setClearBusy(true);
    setProfileMessage("");
    try {
      const response = await fetch("/api/student/ai-tutor/profile", {
        method: "DELETE", credentials: "same-origin", cache: "no-store",
      });
      if (!response.ok) {
        setProfileMessage("پاک‌کردن داده‌ها ممکن نشد؛ دوباره وارد حسابت شو و تلاش کن.");
        return;
      }
      setTopics([]);
      setProfileMessage("موضوع‌های ثبت‌شده پاک شدند.");
    } catch {
      setProfileMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setClearBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-dena-line bg-white p-5" aria-labelledby="tutor-chat-title">
      <div>
        <h2 id="tutor-chat-title" className="text-lg font-extrabold text-dena-deep">گفت‌وگو با معلم دنا</h2>
        <p className="mt-1 text-sm leading-7 text-dena-muted">
          پاسخ‌ها از مجموعهٔ آغازین دنا بازیابی می‌شوند؛ اگر پرسشت در این مجموعه نباشد، پاسخ ساخته نمی‌شود.
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
          <label className="flex items-start gap-3 text-sm font-normal leading-7 text-dena-muted">
            <input type="checkbox" checked={rememberTopic}
              onChange={(event) => setRememberTopic(event.target.checked)}
              className="mt-2 size-4 accent-dena-brand" />
            <span>موضوع این پرسش برای پیشنهادهای آینده ذخیره شود. فقط شناسهٔ درس و تعداد پرسش نگه‌داری می‌شود، نه متن گفت‌وگو. نتیجهٔ تمرین رضایت جداگانه می‌خواهد. این گزینه اختیاری است.</span>
          </label>
          <button className="rounded-xl bg-dena-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !courseId}>
            {busy ? "در حال بررسی…" : "پرسیدن"}
          </button>
        </form>
      )}
      {topics.length > 0 && (
        <div className="space-y-3 rounded-xl border border-dena-line p-4">
          <h3 className="font-bold text-dena-ink">موضوع‌های ثبت‌شده در مسیر شخصی تو</h3>
          <ul className="space-y-2 text-sm text-dena-muted">
            {topics.map((topic) => (
              <li key={topic.topicId}>
                {topicTitles[topic.topicId] ?? "موضوع آموزشی"} · {topic.questionCount.toLocaleString("fa-IR")} پرسش · آخرین بار {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(topic.lastAskedAt))}{topic.practiceAttemptCount > 0 && <> · {topic.practiceAttemptCount.toLocaleString("fa-IR")} نتیجهٔ ذخیره‌شده، {topic.practiceCorrectCount.toLocaleString("fa-IR")} پاسخ درست</>}
              </li>
            ))}
          </ul>
          <button type="button" className="text-sm font-bold text-dena-brand underline disabled:opacity-50"
            disabled={clearBusy} onClick={() => void clearTopics()}>
            {clearBusy ? "در حال پاک‌کردن…" : "پاک‌کردن داده‌های مسیر شخصی"}
          </button>
          <AiTutorPractice key={courseId} courseId={courseId}
            enabled={Boolean(courseId && topics.length > 0)}
            onOutcomeSaved={(topicId, correct) => setTopics((current) => current.map((topic) =>
              topic.topicId === topicId ? {
                ...topic,
                practiceAttemptCount: Math.min(topic.practiceAttemptCount + 1, 10000),
                practiceCorrectCount: Math.min(topic.practiceCorrectCount + (correct ? 1 : 0), 10000),
              } : topic))} />
        </div>
      )}
      {profileMessage && <p role="status" className="text-sm text-dena-muted">{profileMessage}</p>}
      {result && (
        <div aria-live="polite" className="rounded-xl bg-dena-lavender p-4 text-sm leading-8 text-dena-ink">
          {result.answer ? (
            <>
              <p className="whitespace-pre-line">{result.answer}</p>
              {result.topicRecorded && <p className="mt-2 text-xs text-dena-muted">موضوع در مسیر شخصی تو ثبت شد.</p>}
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
