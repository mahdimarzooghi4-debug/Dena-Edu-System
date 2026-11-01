"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

const choices = [
  { id: "five", label: "۵" },
  { id: "six", label: "۶" },
  { id: "seven", label: "۷" },
  { id: "eight", label: "۸" },
];

const initialAnswers: Record<number, string> = { 1: "five", 2: "six", 3: "seven" };

export function DemoPracticeCard() {
  const [current, setCurrent] = useState(3);
  const [answers, setAnswers] = useState<Record<number, string>>(initialAnswers);
  const [submitted, setSubmitted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const selected = answers[current] ?? "";

  function choose(value: string) {
    setAnswers((previous) => ({ ...previous, [current]: value }));
    setSubmitted(false);
  }

  function goToQuestion(question: number) {
    setCurrent(question);
    setSubmitted(false);
    setShowMap(false);
  }

  const questionRows = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

  function QuestionMap({ compact = false }: { compact?: boolean }) {
    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        {!compact && <h2 className="text-base font-extrabold text-dena-deep">نقشه پرسش‌ها</h2>}
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
                    aria-label={`رفتن به پرسش ${question.toLocaleString("fa-IR")}`}
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
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1160px] space-y-5">
      <div dir="ltr" className="grid gap-6 lg:grid-cols-[380px_minmax(0,720px)] lg:justify-center">
        <aside dir="rtl" className="order-2 hidden space-y-5 lg:block lg:order-1">
          <Card className="rounded-2xl p-5"><QuestionMap /></Card>
          <Card className="space-y-2 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-dena-deep">نکته تلاش آزمون</h3>
            <p className="text-[13px] leading-6 text-dena-muted">پرسش‌های این تلاش به‌صورت تصادفی از بانک سؤال مؤسسه انتخاب شده‌اند. با تمرکز کامل پاسخ بده.</p>
          </Card>
        </aside>

        <main dir="rtl" className="order-1 min-w-0 lg:order-2">
          <Card className="space-y-5 rounded-[20px] p-5 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:space-y-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-dena-brand">پرسش {current.toLocaleString("fa-IR")} از ۱۰</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="hidden rounded-full bg-dena-bg px-3 py-1.5 text-xs text-dena-muted sm:inline-flex">مؤسسه آموزشی البرز</span>
                <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-semibold text-dena-brand">آزمون یادگیری</span>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-dena-border bg-white p-5 md:border-0 md:p-0">
              <p className="text-xs font-semibold text-dena-muted">ریاضی دهم · فصل سوم · تابع و نمودار</p>
              <h2 className="text-lg font-extrabold leading-8 text-dena-deep md:text-2xl md:leading-9">
                اگر تابع f(x) = ۲x + ۱ باشد، مقدار f(۳) کدام است؟
              </h2>
              <div className="border-t border-dena-border pt-4">
                <fieldset className="space-y-2.5" aria-label="گزینه‌های پاسخ">
                  {choices.map((choice, index) => (
                    <label
                      key={choice.id}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition md:p-4 ${selected === choice.id ? "border-2 border-dena-brand bg-white" : "border-dena-border bg-white hover:border-dena-brand"}`}
                    >
                      <span className="font-semibold text-dena-deep">{choice.label}</span>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${selected === choice.id ? "bg-dena-brand text-white" : "border border-dena-border bg-dena-bg text-dena-muted"}`}>{(index + 1).toLocaleString("fa-IR")}</span>
                      <input
                        type="radio"
                        name="demo-practice-answer"
                        value={choice.id}
                        checked={selected === choice.id}
                        onChange={() => choose(choice.id)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </fieldset>
              </div>
            </div>

            {submitted && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                پاسخ برای پیش‌نمایش ثبت شد؛ اطلاعات آزمون به حساب واقعی ارسال یا ذخیره نمی‌شود.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMap((visible) => !visible)}
              aria-expanded={showMap}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-dena-bg p-3 text-[13px] font-bold text-dena-brand lg:hidden"
            >
              {showMap ? "بستن نقشه پرسش‌ها" : "مشاهده نقشه پرسش‌ها"} <span aria-hidden="true">{showMap ? "⌃" : "⌄"}</span>
            </button>
            {showMap && <div className="rounded-2xl border border-dena-border bg-white p-4 lg:hidden"><QuestionMap compact /></div>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-5">
              <button type="button" onClick={() => goToQuestion(Math.min(10, current + 1))} disabled={current === 10} className={buttonClassName()}>
                سؤال بعدی
              </button>
              <div className="flex items-center gap-2">
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
