"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AiTutorPractice } from "./ai-tutor-practice";
import { StudentCoursePractice } from "./course-practice";
import { DENA_LEARNING_CONCEPTS } from "../../server/ai-tutor/learning-concepts";
import { getReviewPracticeTopic, getStudyPrompt, recommendNextStudyStep } from "../../server/ai-tutor/study-recommendation";

type Course = { courseId: string; title: string };
type TutorResponse = {
  answer?: string;
  source?: { id: string; title: string; corpusVersion?: string; kind?: "video"; conceptId?: string | null };
  error?: string;
  code?: string;
  topicRecorded?: boolean;
  topicId?: string;
  guidedHint?: string;
  coursePractice?: {
    courseId: string;
    learningConceptId: string | null;
    prompt: string;
    options: string[];
    attempt: { selectedOption: number; correct: boolean; submittedAt: string } | null;
  } | null;
};
type Topic = { topicId: string; questionCount: number; lastAskedAt: string; practiceAttemptCount: number; practiceCorrectCount: number; practiceNeedsGuidance: boolean; lessonFeedback: "understood" | "needs_help" | null };
const topicTitles: Record<string, string> = {
  "math.linear-equation.v1": "معادلهٔ یک‌مجهولی",
  "math.fractions.add.v1": "جمع کسرها",
  "math.percent.v1": "درصد",
  "science.light.v1": "نور و عدسی",
  "geography.climate.v1": "اقلیم و رطوبت",
};

export function AiTutorChat({ courses, initialTopics, initialGuidanceConceptIds, initialHelpfulConceptIds }: {
  courses: Course[];
  initialTopics: Topic[];
  initialGuidanceConceptIds: string[];
  initialHelpfulConceptIds: string[];
}) {
  const [courseId, setCourseId] = useState(courses[0]?.courseId ?? "");
  const [message, setMessage] = useState("");
  const [rememberTopic, setRememberTopic] = useState(false);
  const [result, setResult] = useState<TutorResponse | null>(null);
  const [topics, setTopics] = useState(initialTopics);
  const [guidanceConceptIds, setGuidanceConceptIds] = useState(initialGuidanceConceptIds);
  const [helpfulConceptIds, setHelpfulConceptIds] = useState(initialHelpfulConceptIds);
  const [busy, setBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [videoFeedbackBusy, setVideoFeedbackBusy] = useState(false);
  const [videoFeedbackResult, setVideoFeedbackResult] = useState<{ assetId: string; needsGuidance: boolean } | null>(null);
  const [videoFeedbackMessage, setVideoFeedbackMessage] = useState("");
  const [lessonFeedbackConsent, setLessonFeedbackConsent] = useState(false);
  const [lessonFeedbackBusy, setLessonFeedbackBusy] = useState(false);
  const [lessonFeedbackMessage, setLessonFeedbackMessage] = useState("");

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
      setVideoFeedbackResult(null);
      setVideoFeedbackMessage("");
      if (data.topicRecorded && data.topicId) {
        const topicId = data.topicId;
        const lastAskedAt = new Date().toISOString();
        setTopics((current) => {
          const existing = current.find((topic) => topic.topicId === topicId);
          if (existing) return current.map((topic) => topic.topicId === topicId
            ? { ...topic, questionCount: Math.min(topic.questionCount + 1, 10000), lastAskedAt }
            : topic);
          return [...current, { topicId, questionCount: 1, lastAskedAt, practiceAttemptCount: 0, practiceCorrectCount: 0, practiceNeedsGuidance: false, lessonFeedback: null }];
        });
      }
    } catch {
      setResult({ error: "ارتباط برقرار نشد؛ دوباره تلاش کن." });
    } finally {
      setBusy(false);
    }
  }

  function recordCoursePracticeOutcome(conceptId: string, correct: boolean) {
    if (!getStudyPrompt(conceptId)) return;
    const lastAskedAt = new Date().toISOString();
    setTopics((current) => {
      const existing = current.find((topic) => topic.topicId === conceptId);
      if (existing) return current.map((topic) => topic.topicId === conceptId
        ? {
            ...topic,
            practiceAttemptCount: Math.min(topic.practiceAttemptCount + 1, 10000),
            practiceCorrectCount: Math.min(topic.practiceCorrectCount + (correct ? 1 : 0), 10000),
            practiceNeedsGuidance: !correct,
            lessonFeedback: null,
          }
        : topic);
      return [...current, {
        topicId: conceptId, questionCount: 1, lastAskedAt,
        practiceAttemptCount: 1, practiceCorrectCount: correct ? 1 : 0,
        practiceNeedsGuidance: !correct,
        lessonFeedback: null,
      }];
    });
  }

  async function saveLessonFeedback(lessonFeedback: "understood" | "needs_help") {
    if (!recommendation || !lessonFeedbackConsent || lessonFeedbackBusy) return;
    setLessonFeedbackBusy(true);
    setLessonFeedbackMessage("");
    try {
      const response = await fetch("/api/student/ai-tutor/profile", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: recommendation.topicId, lessonFeedback, consent: true }),
      });
      if (!response.ok) {
        setLessonFeedbackMessage("ذخیرهٔ بازخورد انجام نشد؛ دوباره تلاش کن.");
        return;
      }
      setTopics((current) => current.map((topic) => topic.topicId === recommendation.topicId
        ? { ...topic, lessonFeedback } : topic));
      setLessonFeedbackConsent(false);
      setLessonFeedbackMessage(lessonFeedback === "understood"
        ? "بازخوردت با اجازهٔ تو در مسیر شخصی ذخیره شد."
        : "درخواست راهنمایی بیشتر با اجازهٔ تو در مسیر شخصی ذخیره شد.");
    } catch {
      setLessonFeedbackMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setLessonFeedbackBusy(false);
    }
  }

  async function saveVideoFeedback(needsGuidance: boolean) {
    if (!courseId || !result?.source?.id || videoFeedbackBusy) return;
    const assetId = result.source.id;
    setVideoFeedbackBusy(true);
    setVideoFeedbackMessage("");
    try {
      const response = await fetch("/api/student/ai-tutor/video-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, assetId, needsGuidance }),
      });
      if (!response.ok) {
        setVideoFeedbackMessage("ثبت بازخورد انجام نشد؛ دوباره تلاش کن.");
        return;
      }
      setVideoFeedbackResult({ assetId, needsGuidance });
      try {
        const profileResponse = await fetch("/api/student/ai-tutor/profile", { cache: "no-store" });
        if (profileResponse.ok) {
          const profile = await profileResponse.json() as { guidanceConceptIds?: string[]; helpfulConceptIds?: string[] };
          setGuidanceConceptIds(profile.guidanceConceptIds ?? []);
          setHelpfulConceptIds(profile.helpfulConceptIds ?? []);
        }
      } catch {
        // The feedback write succeeded; the updated profile will load next visit.
      }
      setVideoFeedbackMessage(needsGuidance
        ? "برای پاسخ‌های بعدی از این ویدئو راهنمای بیشتری می‌گیرم."
        : "بازخوردت ثبت شد؛ ممنون.");
    } catch {
      setVideoFeedbackMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setVideoFeedbackBusy(false);
    }
  }

  async function clearTopics() {
    if ((!topics.length && !guidanceConceptIds.length && !helpfulConceptIds.length) || clearBusy ||
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
      setGuidanceConceptIds([]);
      setHelpfulConceptIds([]);
      setProfileMessage("داده‌های ثبت‌شده پاک شدند.");
    } catch {
      setProfileMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setClearBusy(false);
    }
  }

  const recommendation = recommendNextStudyStep(topics);
  const reviewPracticeTopicId = getReviewPracticeTopic(topics);

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
      {(topics.length > 0 || guidanceConceptIds.length > 0 || helpfulConceptIds.length > 0) && (
        <div className="space-y-3 rounded-xl border border-dena-line p-4">
          <h3 className="font-bold text-dena-ink">مسیر آموزشی ثبت‌شدهٔ تو</h3>
          {guidanceConceptIds.length > 0 && <div className="text-sm text-dena-muted"><p className="font-semibold">مباحثی که برایشان راهنمایی بیشتری خواستی:</p><ul className="mt-2 list-inside list-disc">{guidanceConceptIds.map((id) => <li key={id}>{DENA_LEARNING_CONCEPTS.find((concept) => concept.id === id)?.label ?? "مبحث آموزشی"}</li>)}</ul></div>}
          {helpfulConceptIds.length > 0 && <div className="text-sm text-dena-muted"><p className="font-semibold">مباحثی که محتوای ویدئویی‌شان به تو کمک کرده:</p><ul className="mt-2 list-inside list-disc">{helpfulConceptIds.map((id) => <li key={id}>{DENA_LEARNING_CONCEPTS.find((concept) => concept.id === id)?.label ?? "مبحث آموزشی"}</li>)}</ul></div>}
          {topics.length > 0 && <ul className="space-y-2 text-sm text-dena-muted">
            {topics.map((topic) => (
              <li key={topic.topicId}>
                {topicTitles[topic.topicId] ?? "موضوع آموزشی"} · {topic.questionCount.toLocaleString("fa-IR")} پرسش · آخرین بار {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(topic.lastAskedAt))}{topic.practiceAttemptCount > 0 && <> · {topic.practiceAttemptCount.toLocaleString("fa-IR")} نتیجهٔ ذخیره‌شده، {topic.practiceCorrectCount.toLocaleString("fa-IR")} پاسخ درست{topic.practiceNeedsGuidance && " · تمرین بعدی با راهنما"} </>}
              </li>
            ))}
          </ul>}
          {recommendation && (
            <div className="rounded-xl bg-dena-bg p-4 text-sm leading-7">
              <p className="font-bold text-dena-ink">پیشنهاد مرور بعدی</p>
              <p className="mt-1 text-dena-muted">
                در تمرین ذخیره‌شدهٔ «{topicTitles[recommendation.topicId] ?? "این مبحث"}» به راهنمایی بیشتری نیاز داشتی؛ این کارت از مجموعهٔ آغازین دناست.
              </p>
              <p className="mt-2 rounded-lg border border-dena-line bg-white p-3 text-dena-ink">
                {recommendation.explanation}
              </p>
              <label className="mt-3 flex items-start gap-2 text-dena-muted">
                <input type="checkbox" checked={lessonFeedbackConsent}
                  onChange={(event) => setLessonFeedbackConsent(event.target.checked)}
                  className="mt-2 size-4 accent-dena-brand" />
                <span>اجازه می‌دهم بازخورد این درس در مسیر یادگیری شخصی من ذخیره شود.</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={!lessonFeedbackConsent || lessonFeedbackBusy}
                  onClick={() => void saveLessonFeedback("understood")}
                  className="rounded-lg border border-dena-line px-3 py-2 font-bold disabled:opacity-50">
                  فهمیدم
                </button>
                <button type="button" disabled={!lessonFeedbackConsent || lessonFeedbackBusy}
                  onClick={() => void saveLessonFeedback("needs_help")}
                  className="rounded-lg border border-dena-line px-3 py-2 font-bold disabled:opacity-50">
                  هنوز کمک می‌خواهم
                </button>
              </div>
              {reviewPracticeTopicId && (
                <AiTutorPractice
                  key={"review-" + courseId + "-" + reviewPracticeTopicId}
                  courseId={courseId}
                  topics={[{
                    topicId: reviewPracticeTopicId,
                    title: topicTitles[reviewPracticeTopicId] ?? "موضوع آموزشی",
                  }]}
                  initialTopicId={reviewPracticeTopicId}
                  title="تمرین مرور همین مبحث"
                  headingId={"tutor-review-practice-" + reviewPracticeTopicId}
                  showTopicSelector={false}
                  enabled={Boolean(courseId)}
                  onOutcomeSaved={recordCoursePracticeOutcome}
                />
              )}
              <button type="button" onClick={() => setMessage(recommendation.prompt)}
                className="mt-2 font-bold text-dena-brand underline underline-offset-4">
                رفتن به تمرین این مبحث
              </button>
            </div>
          )}
          {lessonFeedbackMessage && <p role="status" className="text-sm text-dena-muted">{lessonFeedbackMessage}</p>}
          {topics.some((topic) => topic.lessonFeedback) && <p className="text-xs text-dena-muted">بازخورد ثبت‌شدهٔ درس در مسیر شخصی تو نگه‌داری می‌شود و با پاک‌کردن مسیر حذف می‌شود.</p>}
          <button type="button" className="text-sm font-bold text-dena-brand underline disabled:opacity-50"
            disabled={clearBusy} onClick={() => void clearTopics()}>
            {clearBusy ? "در حال پاک‌کردن…" : "پاک‌کردن داده‌های مسیر شخصی"}
          </button>
          {topics.length > 0 && <AiTutorPractice key={courseId} courseId={courseId}
            topics={topics.map((topic) => ({
              topicId: topic.topicId,
              title: topicTitles[topic.topicId] ?? "موضوع آموزشی",
            }))}
            enabled={Boolean(courseId && topics.length > 0)}
            onOutcomeSaved={(topicId, correct) => setTopics((current) => current.map((topic) =>
              topic.topicId === topicId ? {
                ...topic,
                practiceAttemptCount: Math.min(topic.practiceAttemptCount + 1, 10000),
                practiceCorrectCount: Math.min(topic.practiceCorrectCount + (correct ? 1 : 0), 10000),
                practiceNeedsGuidance: !correct,
                lessonFeedback: null,
              } : topic))} />}
        </div>
      )}
      {profileMessage && <p role="status" className="text-sm text-dena-muted">{profileMessage}</p>}
      {result && (
        <div aria-live="polite" className="rounded-xl bg-dena-lavender p-4 text-sm leading-8 text-dena-ink">
          {result.answer ? (
            <>
              <p className="whitespace-pre-line">{result.answer}</p>
              {result.guidedHint && (
                <p className="mt-3 rounded-xl border border-dena-line bg-white p-3 text-sm leading-7">
                  <span className="font-bold text-dena-brand">
                    راهنمایی بیشتر بر پایهٔ تمرین ذخیره‌شده:
                  </span>{" "}
                  {result.guidedHint}
                </p>
              )}
              {result.coursePractice && (
                <StudentCoursePractice courseId={result.coursePractice.courseId}
                  question={result.coursePractice}
                  onResultRecorded={recordCoursePracticeOutcome} />
              )}
              {result.topicRecorded && <p className="mt-2 text-xs text-dena-muted">موضوع در مسیر شخصی تو ثبت شد.</p>}
              {result.source?.kind === "video" && (
                <div className="mt-3 border-t border-dena-line pt-3">
                  <p className="text-xs text-dena-muted">
                    این بازخورد فقط برای مسیر شخصی تو ذخیره می‌شود و متن گفت‌وگو ثبت نمی‌شود.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={videoFeedbackBusy}
                      onClick={() => void saveVideoFeedback(true)}
                      className="rounded-lg border border-dena-line px-3 py-2 text-xs font-bold text-dena-ink disabled:opacity-50">
                      توضیح بیشتری لازم دارم
                    </button>
                    <button type="button" disabled={videoFeedbackBusy}
                      onClick={() => void saveVideoFeedback(false)}
                      className="rounded-lg border border-dena-line px-3 py-2 text-xs font-bold text-dena-ink disabled:opacity-50">
                      این پاسخ کمک کرد
                    </button>
                  </div>
                  {videoFeedbackResult?.assetId === result.source.id && videoFeedbackMessage && (
                    <p role="status" className="mt-2 text-xs text-dena-muted">{videoFeedbackMessage}</p>
                  )}
                </div>
              )}
              <p className="mt-3 border-t border-dena-line pt-2 text-xs text-dena-muted">
                منبع: {result.source?.title}{result.source?.corpusVersion && <> · نسخهٔ مجموعه: {result.source.corpusVersion}</>}
              </p>
              {result.source?.kind === "video" && (
                <Link
                  href={`/student/courses/${courseId}/watch#video-${result.source.id}`}
                  className="mt-2 inline-block text-sm font-bold text-dena-brand underline underline-offset-4"
                >
                  رفتن به ویدئوی منبع
                </Link>
              )}
            </>
          ) : <p>{result.error ?? "برای این پرسش هنوز محتوای آموزشی آماده ندارم."}</p>}
        </div>
      )}
    </section>
  );
}
