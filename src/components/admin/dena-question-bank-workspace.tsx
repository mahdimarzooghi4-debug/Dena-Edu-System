"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";

export type DenaBankQuestion = {
  id: string;
  prompt: string;
  option0: string;
  option1: string;
  option2: string;
  option3: string;
  correctOption: number;
  createdAt: Date;
};

function QuestionEditor({ question, onCancel }: {
  question?: DenaBankQuestion;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>([
    question?.option0 ?? "", question?.option1 ?? "",
    question?.option2 ?? "", question?.option3 ?? "",
  ]);
  const [correctOption, setCorrectOption] = useState(question?.correctOption ?? 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(question
        ? "/api/admin/question-bank/" + encodeURIComponent(question.id)
        : "/api/admin/question-bank", {
        method: question ? "PATCH" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, options, correctOption }),
      });
      if (!response.ok) {
        setMessage("ذخیره انجام نشد؛ سؤال و گزینه‌ها را بررسی کنید.");
        return;
      }
      onCancel();
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-xl border border-dena-border bg-dena-bg p-5">
      <h2 className="font-extrabold">{question ? "ویرایش سؤال دنا" : "افزودن سؤال به بانک دنا"}</h2>
      <label className="block space-y-2 text-sm font-bold">
        <span>متن سؤال</span>
        <textarea required minLength={10} maxLength={500} rows={4} value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="w-full rounded-lg border border-dena-border bg-white p-3 font-normal leading-7" />
      </label>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-bold">گزینه‌های پاسخ؛ پاسخ صحیح را مشخص کن</legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-3">
            <input type="radio" name="dena-correct-option" required
              aria-label={"گزینهٔ " + (index + 1) + " پاسخ صحیح است"}
              checked={correctOption === index} onChange={() => setCorrectOption(index)} />
            <input required maxLength={160} value={option}
              aria-label={"متن گزینهٔ " + (index + 1)}
              onChange={(event) => setOptions((current) => current.map((value, item) =>
                item === index ? event.target.value : value) as typeof current)}
              placeholder={"گزینهٔ " + (index + 1).toLocaleString("fa-IR")}
              className="min-h-11 flex-1 rounded-lg border border-dena-border bg-white px-3 text-sm" />
          </div>
        ))}
      </fieldset>
      <p className="text-xs leading-6 text-dena-muted">
        این سؤال فقط در بانک مستقل دنا ذخیره می‌شود؛ بانک مؤسسه‌ها از این فهرست جداست.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره"}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>انصراف</Button>
      </div>
      {message && <p role="status" className="text-sm text-dena-deep">{message}</p>}
    </form>
  );
}

export function DenaQuestionBankWorkspace({ questions }: { questions: DenaBankQuestion[] }) {
  const [editor, setEditor] = useState<"new" | DenaBankQuestion | null>(null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dena-muted">
          {questions.length.toLocaleString("fa-IR")} سؤال اخیر · حداکثر ۱۰۰ مورد
        </p>
        {editor === null && <Button onClick={() => setEditor("new")}>افزودن سؤال به بانک دنا</Button>}
      </div>
      {editor !== null && (
        <QuestionEditor question={editor === "new" ? undefined : editor}
          onCancel={() => setEditor(null)} />
      )}
      {questions.length === 0 ? (
        <div className="rounded-xl border border-dena-border bg-white p-6 text-sm leading-7 text-dena-muted">
          هنوز سؤالی در بانک دنا ثبت نشده است.
        </div>
      ) : (
        <ol className="space-y-3">
          {questions.map((question) => (
            <li key={question.id} className="rounded-xl border border-dena-border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold leading-7">{question.prompt}</h2>
                  <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {[question.option0, question.option1, question.option2, question.option3].map((option, index) => (
                      <li key={index} className={"rounded-lg p-3 " + (index === question.correctOption ? "bg-emerald-50 font-semibold text-emerald-800" : "bg-dena-bg text-dena-ink")}>
                        {"گزینهٔ " + (index + 1).toLocaleString("fa-IR") + ": " + option}
                        {index === question.correctOption ? " · پاسخ صحیح" : ""}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-dena-muted">
                    ثبت‌شده در {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(question.createdAt)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setEditor(question)}>ویرایش</Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
