"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

const choices = [
  { id: "seven", label: "۷" },
  { id: "six", label: "۶" },
  { id: "five", label: "۵" },
  { id: "four", label: "۴" },
];

const initialAnswers: Record<number, string> = { 1: "seven", 2: "six", 3: "seven" };

export function DemoPracticeCard() {
  const [current, setCurrent] = useState(3);
  const [answers, setAnswers] = useState<Record<number, string>>(initialAnswers);
  const [submitted, setSubmitted] = useState(false);
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const selected = answers[current] ?? "";

  function choose(value: string) {
    setAnswers((previous) => ({ ...previous, [current]: value }));
    setSubmitted(false);
  }

  function goToQuestion(question: number) {
    setCurrent(question);
    setSubmitted(false);
  }

  const questionRows = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

  return (
    <div className="mx-auto max-w-[1160px] space-y-5">
      <div dir="ltr" className="grid gap-6 lg:grid-cols-[380px_minmax(0,720px)] lg:justify-center">
        <aside dir="rtl" className="order-2 space-y-5 lg:order-1">
          <Card className="space-y-4 rounded-2xl p-5">
            <h2 className="text-base font-extrabold text-dena-deep">نقشه پرسش‌ها</h2>
            <div className="space-y-2">
              {questionRows.map((row) => (
                <div key={row[0]} dir="rtl" className="flex flex-wrap gap-2">
                  {row.map((question) => {
                    const active = question === current;
                    const answered = Boolean(answers[question]);
                    return (
                      <button
                        key={question}
                        type="button"
                        onClick={() => goToQuestion(question)}
                        aria-label={`رفتن به پرسش ${question}`}
                        aria-current={active ? "step" : undefined}
                        className={`grid size-10 place-items-center rounded-full border text-sm font-bold transition-colors ${active ? "border-dena-brand bg-dena-brand text-white" : answered ? "border-dena-brand bg-dena-lavender text-dena-brand" : "border-dena-border bg-white text-dena-muted hover:border-dena-brand"}`}
                      >
                        {question.toLocaleString("fa-IR")}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="border-t border-dena-border pt-3 text-sm leading-7 text-dena-muted">
              <p>{answeredCount.toLocaleString("fa-IR")} پرسش پاسخ‌داده‌شده</p>
              <p>{(10 - answeredCount).toLocaleString("fa-IR")} پرسش بدون پاسخ</p>
            </div>
          </Card>

          <Card className="space-y-2 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-dena-deep">نکته تلاش آزمون</h3>
            <p className="text-[13px] leading-6 text-dena-muted">پرسش‌های این تلاش به‌صورت تصادفی از بانک سؤال مؤسسه انتخاب شده‌اند. با تمرکز کامل پاسخ بده.</p>
          </Card>
        </aside>

        <main dir="rtl" className="order-1 min-w-0 lg:order-2">
          <Card className="space-y-6 rounded-[20px] p-5 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-dena-brand">پرسش {current.toLocaleString("fa-IR")} از ۱۰</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs text-dena-muted">مؤسسه آموزشی البرز</span>
                <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-semibold text-dena-brand">آزمون یادگیری</span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-dena-muted">ریاضی دهم · فصل سوم · تابع و نمودار</p>
              <h2 className="text-xl font-extrabold leading-9 text-dena-deep md:text-2xl">
                اگر تابع f(x) = ۲x + ۱ باشد، مقدار f(۳) کدام است؟
              </h2>
              <p className="text-sm text-dena-muted">یک گزینه را انتخاب کن.</p>
            </div>

            <fieldset className="space-y-3" aria-label="گزینه‌های پاسخ">
              {choices.map((choice, index) => (
                <label
                  key={choice.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition ${selected === choice.id ? "border-dena-brand bg-dena-lavender" : "border-dena-border bg-white hover:border-dena-brand"}`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="demo-practice-answer"
                      value={choice.id}
                      checked={selected === choice.id}
                      onChange={() => choose(choice.id)}
                      className="size-4 accent-dena-brand"
                    />
                    <span className="font-semibold text-dena-ink">{choice.label}</span>
                  </span>
                  <span className="grid size-7 place-items-center rounded-full bg-dena-bg text-xs text-dena-muted">{String.fromCharCode(1575 + index)}</span>
                </label>
              ))}
            </fieldset>

            {submitted && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                پاسخ برای پیش‌نمایش ثبت شد؛ اطلاعات آزمون به حساب واقعی ارسال یا ذخیره نمی‌شود.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-5">
              <button type="button" onClick={() => goToQuestion(Math.min(10, current + 1))} disabled={current === 10} className={buttonClassName()}>
                سؤال بعدی
              </button>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => goToQuestion(Math.max(1, current - 1))} disabled={current === 1} className={buttonClassName("outline")}>
                  سؤال قبلی
                </button>
                <button type="button" disabled={!selected} onClick={() => setSubmitted(true)} className={buttonClassName("outline")}>
                  ثبت پاسخ
                </button>
              </div>
            </div>
          </Card>
        </main>
      </div>
      <p className="text-xs leading-6 text-dena-muted">این تلاش فقط برای پیش‌نمایش است؛ پاسخ‌ها ذخیره نمی‌شوند و به ارزیابی واقعی متصل نیستند.</p>
    </div>
  );
}
