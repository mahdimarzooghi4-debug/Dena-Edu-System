"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Lesson = { id: string; title: string };
type Assessment = {
  id: string;
  title: string;
  instructions: string;
  questionCount: number;
  requiredCorrectCount: number;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewReason: string | null;
  questions: Array<{
    prompt: string; option0: string; option1: string; option2: string;
    option3: string; correctOption: number; lessonAssetId: string;
  }>;
};
type DraftQuestion = {
  prompt: string;
  options: [string, string, string, string];
  correctOption: number;
  lessonAssetId: string;
};

const emptyQuestion = (lessonAssetId: string): DraftQuestion => ({
  prompt: "", options: ["", "", "", ""], correctOption: 0, lessonAssetId,
});

export function LearningAssessmentAuthor({ courseId, lessons, assessments, canCreate }: {
  courseId: string;
  lessons: Lesson[];
  assessments: Assessment[];
  canCreate: boolean;
}) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questionCount, setQuestionCount] = useState(3);
  const [requiredCorrectCount, setRequiredCorrectCount] = useState(2);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    emptyQuestion(lessons[0]?.id ?? ""),
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateQuestion(index: number, update: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, row) =>
      row === index ? { ...question, ...update } : question));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canCreate) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/provider/courses/${courseId}/assessments`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, instructions, questionCount,
          requiredCorrectCount, questions }),
      });
      if (!response.ok) {
        setMessage(response.status === 422
          ? "بانک سؤال باید دست‌کم به تعداد سؤال‌های هر تلاش سؤال داشته باشد و ویدئوهای انتخابی آماده باشند."
          : response.status === 404
            ? "وضعیت پیش‌نویس یا نظارت دوره تغییر کرده است؛ صفحه را تازه کنید."
            : "ثبت ارزیابی انجام نشد؛ ورودی‌ها را بررسی کنید.");
        return;
      }
      setMessage("ارزیابی ثبت شد و برای بازبینی مستقل مؤسسه ارسال شد.");
      window.location.reload();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally { setBusy(false); }
  }

  const status = { pending: "در انتظار بازبینی مؤسسه", approved: "تأییدشده",
    rejected: "ردشده" } as const;

  return (
    <div className="space-y-6">
      {assessments.map((assessment) => (
        <section key={assessment.id} className="space-y-3 rounded-xl bg-dena-bg p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">{assessment.title}</h2>
              <p className="mt-1 text-sm text-dena-muted">
                {assessment.questionCount} پرسش در هر تلاش · حدنصاب همین ارزیابی: {assessment.requiredCorrectCount}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{status[assessment.reviewStatus]}</span>
          </div>
          {assessment.reviewReason && <p className="text-sm leading-7 text-dena-muted">دلیل بازبینی: {assessment.reviewReason}</p>}
          <details>
            <summary className="cursor-pointer text-sm font-bold text-dena-brand">مشاهدهٔ بانک سؤال و کلیدهای ثبت‌شده</summary>
            <ol className="mt-3 list-inside list-decimal space-y-3 text-sm">
              {assessment.questions.map((question, index) => (
                <li key={`${assessment.id}-${index}`}>
                  {question.prompt}
                  <ol className="ms-5 mt-2 list-inside list-[upper-alpha] space-y-1">
                    {[question.option0, question.option1, question.option2, question.option3].map((option, optionIndex) => <li key={optionIndex}>
                      {option}{optionIndex === question.correctOption ? " — کلید درست" : ""}
                    </li>)}
                  </ol>
                  <p className="mt-1 text-xs text-dena-muted">
                    درس بازبینی: {lessons.find((lesson) => lesson.id === question.lessonAssetId)?.title ?? "درس پیوندخورده"}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        </section>
      ))}

      {canCreate && (
        lessons.length === 0 ? <p role="status" className="rounded-xl bg-dena-bg p-5 text-sm leading-8">
          تا آماده‌شدن حداقل یک ویدئوی درس، ساخت ارزیابی ممکن نیست.
        </p> : (
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            <h2 className="text-lg font-extrabold">ساخت ارزیابی تازه</h2>
            <label className="block space-y-2 text-sm font-bold">
              <span>عنوان ارزیابی</span>
              <input required minLength={3} maxLength={160} value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-dena-border p-3" />
            </label>
            <label className="block space-y-2 text-sm font-bold">
              <span>دستورالعمل</span>
              <textarea required maxLength={1000} rows={3} value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                className="w-full rounded-xl border border-dena-border p-3 leading-7" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold">
                <span>تعداد پرسش در هر تلاش</span>
                <input type="number" min={1} max={100} required value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="block w-full rounded-xl border border-dena-border p-3" />
              </label>
              <label className="space-y-2 text-sm font-bold">
                <span>حداقل پاسخ درست برای تکمیل</span>
                <input type="number" min={1} max={questionCount} required value={requiredCorrectCount}
                  onChange={(event) => setRequiredCorrectCount(Number(event.target.value))}
                  className="block w-full rounded-xl border border-dena-border p-3" />
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-extrabold">بانک سؤال چهارگزینه‌ای</h3>
                <Button type="button" variant="outline" disabled={busy || questions.length >= 100}
                  onClick={() => setQuestions((current) => [...current, emptyQuestion(lessons[0].id)])}>
                  افزودن سؤال
                </Button>
              </div>
              {questions.map((question, index) => (
                <fieldset key={index} className="space-y-4 rounded-xl bg-dena-bg p-4">
                  <legend className="px-2 font-bold">سؤال {(index + 1).toLocaleString("fa-IR")}</legend>
                  <label className="block space-y-2 text-sm font-bold">
                    <span>متن پرسش</span>
                    <textarea required minLength={10} maxLength={500} rows={2}
                      value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                      className="w-full rounded-xl border border-dena-border bg-white p-3 leading-7" />
                  </label>
                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-3">
                        <input type="radio" required name={`correct-${index}`} aria-label={`گزینهٔ ${optionIndex + 1} پاسخ درست است`}
                          checked={question.correctOption === optionIndex}
                          onChange={() => updateQuestion(index, { correctOption: optionIndex })} />
                        <label className="flex-1 space-y-1 text-sm">
                          <span className="block">گزینهٔ {(optionIndex + 1).toLocaleString("fa-IR")}</span>
                          <input required maxLength={160} value={option}
                            onChange={(event) => updateQuestion(index, { options: question.options.map((value, i) => i === optionIndex ? event.target.value : value) as DraftQuestion["options"] })}
                            className="w-full rounded-xl border border-dena-border bg-white p-3" />
                        </label>
                      </div>
                    ))}
                  </div>
                  <label className="block space-y-2 text-sm font-bold">
                    <span>ویدئوی درس برای بازبینی در صورت پاسخ نادرست</span>
                    <select required value={question.lessonAssetId}
                      onChange={(event) => updateQuestion(index, { lessonAssetId: event.target.value })}
                      className="w-full rounded-xl border border-dena-border bg-white p-3">
                      {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                    </select>
                  </label>
                  {questions.length > 1 && <Button type="button" variant="outline" onClick={() => setQuestions((current) => current.filter((_, row) => row !== index))}>
                    حذف این سؤال
                  </Button>}
                </fieldset>
              ))}
            </div>
            <p className="text-sm leading-8 text-dena-muted">
              بانک باید دست‌کم به تعداد سؤال‌های هر تلاش سؤال داشته باشد. ترتیب نمونه برای هر دانش‌آموز تصادفی انتخاب می‌شود.
              ارزیابی پس از ثبت تغییرناپذیر است و حدنصاب فقط برای همین ارزیابی اعمال می‌شود.
            </p>
            <Button type="submit" disabled={busy || questions.length < questionCount}>
              {busy ? "در حال ثبت…" : "ثبت و ارسال برای بازبینی مؤسسه"}
            </Button>
            {message && <p role="status" className="text-sm leading-7">{message}</p>}
          </form>
        )
      )}
      {!canCreate && <p role="status" className="rounded-xl bg-dena-bg p-5 text-sm leading-8">
        ساخت ارزیابی فقط در پیش‌نویسِ دارای نظارت تأییدشده مجاز است؛ ارزیابی‌های قبلی تغییرناپذیرند.
      </p>}
    </div>
  );
}
