"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Question = {
  id: string; prompt: string; option0: string; option1: string;
  option2: string; option3: string; correctOption: number;
  courseId?: string;
};
type Course = { id: string; title: string; lessons: Array<{ id: string; title: string }> };

function localDate(offsetHours: number) {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ExamCreationForm({ kind }: { kind: "institute" | "dena" }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("سؤال‌ها را با دقت بخوانید و پاسخ نهایی را ثبت کنید.");
  const [startsAt, setStartsAt] = useState(localDate(24));
  const [endsAt, setEndsAt] = useState(localDate(27));
  const [duration, setDuration] = useState(60);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const endpoint = kind === "institute" ? "/api/institute/question-bank" : "/api/admin/question-bank";
    void fetch(endpoint, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("bank_unavailable");
        return response.json() as Promise<{ questions: Question[]; courses?: Course[] }>;
      }).then((result) => {
        if (cancelled) return;
        setQuestions(result.questions);
        setCourses(result.courses ?? []);
        if (result.courses?.[0]) setCourseId(result.courses[0].id);
      }).catch(() => { if (!cancelled) setMessage("دریافت بانک سؤال با خطا روبه‌رو شد."); });
    return () => { cancelled = true; };
  }, [kind]);

  const available = useMemo(() => kind === "dena"
    ? questions : questions.filter((question) => question.courseId === courseId),
  [kind, questions, courseId]);
  const canSubmit = title.trim().length >= 3 && instructions.trim().length > 0 &&
    selected.length > 0 && (kind === "dena" || Boolean(courseId));

  function toggle(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 300 ? [...current, id] : current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canSubmit) return;
    setBusy(true); setMessage("");
    try {
      const body = {
        title, instructions, startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(), durationMinutes: duration,
        attemptLimit, questionIds: selected,
        ...(kind === "institute" ? { courseId } : {}),
      };
      const response = await fetch(kind === "institute" ? "/api/institute/exams" : "/api/admin/exams", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) {
        setMessage(response.status === 422
          ? "دوره یا سؤال‌های انتخاب‌شده در دسترس نیستند؛ فهرست را تازه‌سازی کنید."
          : "ثبت آزمون انجام نشد؛ اطلاعات را بررسی کنید.");
        return;
      }
      router.push(kind === "institute" ? "/institute/exams" : "/admin/exams");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-dena-border bg-white p-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold sm:col-span-2">
          <span>عنوان آزمون</span>
          <input required minLength={3} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal" />
        </label>
        {kind === "institute" && <label className="space-y-2 text-sm font-bold sm:col-span-2">
          <span>دوره</span>
          <select required value={courseId} onChange={(event) => { setCourseId(event.target.value); setSelected([]); }}
            className="min-h-11 w-full rounded-lg border border-dena-border bg-white px-3 font-normal">
            <option value="">انتخاب دوره</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>}
        <label className="space-y-2 text-sm font-bold sm:col-span-2">
          <span>راهنمای آزمون</span>
          <textarea required maxLength={2000} rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)}
            className="w-full rounded-lg border border-dena-border p-3 font-normal leading-7" />
        </label>
        <label className="space-y-2 text-sm font-bold"><span>شروع</span><input type="datetime-local" required value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)} className="min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal" /></label>
        <label className="space-y-2 text-sm font-bold"><span>پایان بازهٔ آزمون</span><input type="datetime-local" required value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)} className="min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal" /></label>
        <label className="space-y-2 text-sm font-bold"><span>مدت (دقیقه)</span><input type="number" min={5} max={300} required value={duration}
          onChange={(event) => setDuration(Number(event.target.value))} className="min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal" /></label>
        <label className="space-y-2 text-sm font-bold"><span>تعداد دفعات مجاز برای هر دانش‌آموز</span><input type="number" min={1} max={20} required value={attemptLimit}
          onChange={(event) => setAttemptLimit(Number(event.target.value))} className="min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal" /></label>
      </div>

      <section className="space-y-3" aria-labelledby="pick-questions">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pick-questions" className="text-lg font-extrabold text-dena-deep">انتخاب سؤال‌ها</h2>
          <p className="text-sm text-dena-muted">انتخاب‌شده: {selected.length.toLocaleString("fa-IR")}</p>
        </div>
        {available.length === 0 ? <div className="rounded-xl border border-dena-border bg-white p-5 text-sm leading-7 text-dena-muted">
          {kind === "institute" && !courseId ? "ابتدا دوره را انتخاب کنید." : "سؤالی برای این آزمون پیدا نشد؛ ابتدا بانک سؤال را تکمیل کنید."}
          <div className="mt-3"><Link className="font-bold text-dena-brand underline" href={kind === "institute" ? "/institute/question-bank" : "/admin/question-bank"}>رفتن به بانک سؤال</Link></div>
        </div> : <ul className="space-y-2">
          {available.map((question) => <li key={question.id} className="rounded-xl border border-dena-border bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={selected.includes(question.id)} onChange={() => toggle(question.id)} className="mt-1 size-4 accent-dena-brand" />
              <span className="min-w-0"><span className="block font-semibold leading-7">{question.prompt}</span>
                <span className="mt-1 block text-xs text-dena-muted">{[question.option0, question.option1, question.option2, question.option3].join(" · ")}</span></span>
            </label>
          </li>)}
        </ul>}
      </section>
      <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
        با ذخیره، آزمون در وضعیت پیش‌نویس می‌ماند. سؤال‌ها به‌صورت نسخهٔ ثابت در آزمون ثبت می‌شوند.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !canSubmit}>{busy ? "در حال ذخیره…" : "ذخیرهٔ پیش‌نویس آزمون"}</Button>
        <Link href={kind === "institute" ? "/institute/exams" : "/admin/exams"} className="text-sm font-semibold text-dena-muted hover:underline">بازگشت</Link>
      </div>
      {message && <p role="status" className="text-sm text-dena-deep">{message}</p>}
    </form>
  );
}
