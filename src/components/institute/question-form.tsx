"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";

export type InstituteQuestionCourse = {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
};
export type InstituteQuestionDraft = {
  id: string;
  prompt: string;
  option0: string;
  option1: string;
  option2: string;
  option3: string;
  correctOption: number;
  courseId: string;
  lessonAssetId: string;
};

export function InstituteQuestionForm({ courses, question }: {
  courses: InstituteQuestionCourse[];
  question?: InstituteQuestionDraft;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(question?.courseId ?? courses[0]?.id ?? "");
  const selectedCourse = courses.find((course) => course.id === courseId);
  const [lessonAssetId, setLessonAssetId] = useState(
    question?.lessonAssetId ?? selectedCourse?.lessons[0]?.id ?? "",
  );
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>([
    question?.option0 ?? "", question?.option1 ?? "",
    question?.option2 ?? "", question?.option3 ?? "",
  ]);
  const [correctOption, setCorrectOption] = useState(question?.correctOption ?? 0);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(question
        ? `/api/institute/question-bank/${encodeURIComponent(question.id)}`
        : "/api/institute/question-bank", {
        method: question ? "PATCH" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonAssetId, prompt, options, correctOption }),
      });
      if (!response.ok) {
        setMessage(response.status === 422
          ? "دوره یا جلسه دیگر در دسترس نیست؛ فهرست را تازه کنید."
          : response.status === 404
            ? "دسترسی این مؤسسه به سؤال یا دوره تغییر کرده است."
            : "ذخیره انجام نشد؛ اطلاعات را بررسی کنید.");
        return;
      }
      router.push("/institute/question-bank");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion() {
    if (!question || deleting || busy) return;
    if (!window.confirm("از حذف این سؤال مطمئن هستید؟")) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/institute/question-bank/${encodeURIComponent(question.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setMessage(response.status === 404
          ? "این سؤال دیگر در دسترس نیست."
          : "حذف سؤال انجام نشد؛ دوباره تلاش کنید.");
        return;
      }
      router.push("/institute/question-bank");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setDeleting(false);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-[#e5e1ed] bg-white p-6">
        <p className="font-bold text-[#1e1a33]">هنوز جلسهٔ آماده‌ای برای سؤال وجود ندارد.</p>
        <p className="mt-2 text-sm leading-7 text-[#6e6a8a]">
          پس از تأیید نظارت دوره و آماده‌شدن دست‌کم یک ویدئوی جلسه، می‌توانی سؤال را به همان دوره و جلسه پیوند بدهی.
        </p>
        <Link href="/institute/question-bank" className="mt-5 inline-flex text-sm font-bold text-[#5b4ce2] hover:underline">
          بازگشت به بانک سؤال
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)}
      className="space-y-6 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-7">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-[#1e1a33]">
          <span className="block">دوره آموزشی</span>
          <select required value={courseId}
            onChange={(event) => {
              const next = courses.find((course) => course.id === event.target.value);
              setCourseId(event.target.value);
              setLessonAssetId(next?.lessons[0]?.id ?? "");
            }}
            className="block min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f9fafb] px-3 text-[13px] font-normal text-[#1e1a33]">
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold text-[#1e1a33]">
          <span className="block">جلسه مرتبط</span>
          <select required value={lessonAssetId}
            onChange={(event) => setLessonAssetId(event.target.value)}
            className="block min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f9fafb] px-3 text-[13px] font-normal text-[#1e1a33]">
            {selectedCourse?.lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[#1e1a33]">قالب سؤال: چهارگزینه‌ای</legend>
        <label className="inline-flex min-h-8 items-center gap-2 text-[13px] text-[#1e1a33]">
          <input type="radio" checked readOnly aria-label="چهارگزینه‌ای" className="accent-[#5b4ce2]" />
          چهارگزینه‌ای
        </label>
      </fieldset>

      <label className="block space-y-2 text-sm font-semibold text-[#1e1a33]">
        <span>متن سؤال</span>
        <textarea required minLength={10} maxLength={500} rows={4} value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="صورت سؤال را در این قسمت وارد نمایید..."
          className="h-[100px] w-full resize-y rounded-lg border border-[#e5e1ed] p-3 text-sm font-normal leading-7 placeholder:text-[#8b86a3] focus:border-[#5b4ce2] focus:outline-none focus:ring-2 focus:ring-[#5b4ce2]/15" />
      </label>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-[#1e1a33]">گزینه‌های پاسخ</legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-3">
            <input type="radio" name="correct-option" required
              aria-label={`گزینهٔ ${index + 1} پاسخ صحیح است`}
              checked={correctOption === index} onChange={() => setCorrectOption(index)}
              className="h-[18px] w-[18px] shrink-0 accent-[#5b4ce2]" />
            <input required maxLength={160} value={option}
              aria-label={`متن گزینهٔ ${index + 1}`}
              onChange={(event) => setOptions((current) => current.map((value, item) =>
                item === index ? event.target.value : value) as typeof current)}
              placeholder={`گزینهٔ ${(index + 1).toLocaleString("fa-IR")}`}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#e5e1ed] px-3 text-[13px] placeholder:text-[#8b86a3] focus:border-[#5b4ce2] focus:outline-none focus:ring-2 focus:ring-[#5b4ce2]/15" />
          </div>
        ))}
      </fieldset>

      <p className="flex items-center gap-2 border-t border-[#e5e1ed] pt-4 text-xs leading-6 text-[#6e6a8a]">
        <span aria-hidden="true" className="font-bold text-[#5b4ce2]">ⓘ</span>
        پاسخ صحیح فقط برای ارزیابی داخلی استفاده می‌شود.
      </p>
      <div className="flex flex-wrap gap-3 border-t border-[#e5e1ed] pt-3">
        <Button type="submit" disabled={busy}>
          {busy ? "در حال ذخیره…" : "ذخیره"}
        </Button>
        <Link href="/institute/question-bank"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e5e1ed] bg-white px-6 py-2.5 text-sm font-semibold text-[#1e1a33] hover:bg-[#f7f6fb]">
          انصراف
        </Link>
      </div>
      {message && <p role="status" className="text-sm leading-7 text-[#1e1a33]">{message}</p>}
    </form>
  );
}
