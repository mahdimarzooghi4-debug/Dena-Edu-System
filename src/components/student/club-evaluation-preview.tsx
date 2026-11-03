"use client";

import Link from "next/link";
import { useState } from "react";

const questions = [
  "متن سؤال ارزیابی عضویت پس از اتصال سامانه نمایش داده می‌شود.",
  "متن سؤال ارزیابی عضویت پس از اتصال سامانه نمایش داده می‌شود.",
  "فکر می‌کنید خلاقیت و کارآفرینی چگونه می‌تواند در بهبود مسیر تحصیلی شما مؤثر باشد؟",
  "متن سؤال ارزیابی عضویت پس از اتصال سامانه نمایش داده می‌شود.",
  "متن سؤال ارزیابی عضویت پس از اتصال سامانه نمایش داده می‌شود.",
  "متن سؤال ارزیابی عضویت پس از اتصال سامانه نمایش داده می‌شود.",
];

const faNumber = (value: number) => value.toLocaleString("fa-IR");

export function ClubEvaluationPreview() {
  const [questionIndex, setQuestionIndex] = useState(2);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(""));
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function updateAnswer(value: string) {
    setAnswers((current) => current.map((answer, index) => index === questionIndex ? value : answer));
  }

  if (reviewing) {
    return (
      <div className="space-y-4" dir="rtl">
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep">مرور پاسخ‌ها</h2>
          <p className="text-sm leading-7 text-dena-muted">پاسخ‌های پیش‌نمایش را مرور کنید. در ارزیابی واقعی امکان ویرایش پاسخ‌ها وجود دارد.</p>
        </header>
        <ol className="max-h-[min(58svh,600px)] space-y-2 overflow-y-auto pb-2">
          {questions.map((question, index) => (
            <li key={question} className="rounded-2xl border border-dena-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-dena-deep">سؤال {faNumber(index + 1)} ارزیابی عضویت</h3>
                <button type="button" onClick={() => { setQuestionIndex(index); setReviewing(false); }} className="shrink-0 text-sm font-bold text-dena-brand hover:underline">ویرایش پاسخ</button>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-dena-muted">{answers[index].trim() || "پاسخی در این پیش‌نمایش وارد نشده است."}</p>
            </li>
          ))}
        </ol>
        <div className="space-y-3">
          <button type="button" onClick={() => setConfirming(true)} aria-haspopup="dialog" className="min-h-12 w-full rounded-xl bg-dena-brand px-5 text-sm font-bold text-white hover:bg-dena-brand/90">ثبت نهایی ارزیابی</button>
          {confirming && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setConfirming(false)}>
              <section role="dialog" aria-modal="true" aria-labelledby="evaluation-confirm-title" aria-describedby="evaluation-confirm-description" onClick={(event) => event.stopPropagation()} className="w-full rounded-t-3xl border border-dena-border bg-white px-6 pb-8 pt-6 text-right shadow-2xl sm:max-w-[520px] sm:rounded-2xl sm:p-6">
                <div className="mx-auto mb-6 mt-0 h-1 w-9 rounded-full bg-dena-border sm:hidden" />
                <h3 id="evaluation-confirm-title" className="text-lg font-extrabold text-dena-deep">ارزیابی ثبت شود؟</h3>
                <p id="evaluation-confirm-description" className="mt-3 text-sm leading-7 text-dena-muted">پس از ثبت نهایی، پاسخ‌های این ارزیابی ارسال می‌شوند.</p>
                <div className="mt-7 flex flex-col gap-2 sm:flex-row-reverse">
                  <button type="button" disabled aria-describedby="evaluation-confirm-note" className="min-h-12 flex-1 cursor-not-allowed rounded-xl bg-dena-brand px-5 text-sm font-bold text-white opacity-60">ثبت نهایی</button>
                  <button type="button" onClick={() => setConfirming(false)} className="min-h-12 flex-1 rounded-xl border border-dena-brand bg-white px-5 text-sm font-bold text-dena-brand hover:bg-dena-brand/5">بازگشت به ارزیابی</button>
                </div>
                <p id="evaluation-confirm-note" role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">این فقط پیش‌نمایش فیگماست؛ پاسخ‌ها ارسال یا ذخیره نمی‌شوند.</p>
              </section>
            </div>
          )}
          <div className="text-center">
            <Link href="/student/elite-club/evaluation/status/submitted" className="text-sm font-bold text-dena-brand hover:underline">مشاهدهٔ پیش‌نمایش حالت پس از ثبت</Link>
          </div>
          <p id="club-evaluation-preview-note" role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">این پیش‌نمایش به سامانهٔ ارزیابی متصل نیست؛ پاسخ‌ها فقط تا زمان بازبودن همین صفحه نگه داشته می‌شوند و ارسال یا ذخیره نمی‌شوند.</p>
        </div>
      </div>
    );
  }

  const isLast = questionIndex === questions.length - 1;
  return (
    <div className="space-y-5" dir="rtl">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-bold text-dena-brand">
          <span>مرحله {faNumber(questionIndex + 1)} از {faNumber(questions.length)}</span>
          <span className="text-xs text-dena-muted">پیش‌نمایش ارزیابی</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-dena-border" role="progressbar" aria-label="پیشرفت ارزیابی" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={questionIndex + 1}>
          <div className="h-full rounded-full bg-dena-brand transition-[width]" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <section className="space-y-4 text-right" aria-labelledby="club-evaluation-question-title">
        <h2 id="club-evaluation-question-title" className="text-lg font-extrabold text-dena-deep">ارزیابی باشگاه نخبگان</h2>
        <h3 className="text-base font-bold leading-8 text-dena-ink">سؤال {faNumber(questionIndex + 1)}: {questions[questionIndex]}</h3>
        <p className="text-sm leading-7 text-dena-muted">پاسخ خود را به صورت تشریحی و خلاصه در کادر زیر بنویسید.</p>
        <label className="sr-only" htmlFor="club-evaluation-answer">پاسخ سؤال {faNumber(questionIndex + 1)}</label>
        <textarea
          id="club-evaluation-answer"
          value={answers[questionIndex]}
          onChange={(event) => updateAnswer(event.target.value)}
          placeholder="پاسخ خود را اینجا بنویسید..."
          rows={5}
          className="w-full resize-y rounded-xl border border-dena-border bg-white p-4 text-sm leading-7 text-dena-ink placeholder:text-dena-muted/70 focus:border-dena-brand focus:outline-none focus:ring-2 focus:ring-dena-brand/20"
        />
      </section>

      <div className="flex gap-3">
        <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} className="min-h-12 flex-1 rounded-xl border border-dena-border bg-white px-4 text-sm font-bold text-dena-muted disabled:opacity-50">قبلی</button>
        <button type="button" onClick={() => isLast ? setReviewing(true) : setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))} className="min-h-12 flex-1 rounded-xl bg-dena-brand px-4 text-sm font-bold text-white">{isLast ? "مرور پاسخ‌ها" : "بعدی"}</button>
      </div>
      <p className="text-xs leading-6 text-dena-muted">اطلاعات این صفحه نمونه است و به عضویت یا ارزیابی حساب شما ارتباطی ندارد.</p>
    </div>
  );
}
