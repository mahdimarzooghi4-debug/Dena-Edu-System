"use client";

import Link from "next/link";
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

const questionRows = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

function QuestionMap({
  current,
  answers,
  answeredCount,
  goToQuestion,
  compact = false,
}: {
  current: number;
  answers: Record<number, string>;
  answeredCount: number;
  goToQuestion: (question: number) => void;
  compact?: boolean;
}) {
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


export function DemoPracticeCard({ state = "question" }: { state?: "question" | "review" | "submit-confirm" | "leave-confirm" | "result" | "national" }) {
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

  const backHref = "/student-demo/assessments/math-7-practice/start";
  const reviewHref = backHref + "/review";
  const resultHref = "/student-demo/assessments/math-7-practice/result";

  if (state === "review") return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-5">
      <Card className="space-y-5 rounded-[20px] p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-dena-brand">ریاضی دهم · فصل سوم</p><h2 className="mt-2 text-xl font-extrabold text-dena-deep">مرور پاسخ‌ها</h2></div><span className="rounded-full bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">{answeredCount.toLocaleString("fa-IR")} از ۱۰ پاسخ</span></div>
        <p className="text-sm leading-7 text-dena-muted">پیش از پایان آزمون پاسخ‌ها را بررسی کن. می‌توانی به هر پرسش برگردی و آن را ویرایش کنی.</p>
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({length:10},(_,i)=>i+1).map(q=><div key={q} className="flex items-center justify-between gap-3 rounded-xl border border-dena-border p-4"><div><p className="text-sm font-bold text-dena-deep">پرسش {q.toLocaleString("fa-IR")}</p><p className="mt-1 text-xs text-dena-muted">{answers[q] ? "پاسخ ثبت شده" : "بدون پاسخ"}</p></div><Link href={backHref+"?question="+q} className="text-sm font-bold text-dena-brand">ویرایش ←</Link></div>)}</div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-dena-border pt-5"><Link href={backHref} className={buttonClassName("outline")}>بازگشت به آزمون</Link><Link href={backHref+"/submit-confirm"} className={buttonClassName()}>پایان و ارسال آزمون</Link></div>
      </Card><p className="text-xs leading-6 text-dena-muted">این پیش‌نمایش به آزمون واقعی متصل نیست و پاسخ‌ها ذخیره نمی‌شوند.</p>
    </div>
  );

  if (state === "submit-confirm" || state === "leave-confirm") {
    const submitting = state === "submit-confirm";
    return <div dir="rtl" className="mx-auto max-w-2xl"><Card className="space-y-5 rounded-[20px] p-6 text-center md:p-9"><span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-50 text-2xl text-amber-700" aria-hidden="true">{submitting ? "?" : "↩"}</span><h2 className="text-xl font-extrabold text-dena-deep">{submitting ? "آزمون را ارسال می‌کنی؟" : "از آزمون خارج می‌شوی؟"}</h2><p className="text-sm leading-7 text-dena-muted">{submitting ? `به ${answeredCount.toLocaleString("fa-IR")} پرسش پاسخ داده‌ای. پس از ارسال، در آزمون واقعی امکان تغییر پاسخ‌ها وجود ندارد.` : "با خروج از آزمون، پاسخ‌های این تلاش در نسخه واقعی ممکن است از دست برود."}</p><div className="flex flex-wrap justify-center gap-3"><Link href={submitting ? resultHref : backHref} className={buttonClassName()}>{submitting ? "تأیید و مشاهده نتیجه نمونه" : "بله، خروج"}</Link><Link href={submitting ? reviewHref : backHref} className={buttonClassName("outline")}>{submitting ? "بازگشت و بررسی" : "ادامه آزمون"}</Link></div><p className="text-xs text-dena-muted">این فقط یک تعامل نمایشی است؛ نتیجه‌ای به سامانه ارسال نمی‌شود.</p></Card></div>;
  }

  if (state === "result") return <div dir="rtl" className="mx-auto max-w-3xl space-y-5"><Card className="space-y-5 rounded-[20px] p-6 md:p-9"><div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl text-emerald-700" aria-hidden="true">✓</span><p className="mt-4 text-sm font-bold text-dena-brand">نتیجه آزمون نمونه</p><h2 className="mt-2 text-2xl font-extrabold text-dena-deep">آفرین، آزمون به پایان رسید</h2><p className="mt-2 text-sm leading-7 text-dena-muted">این امتیاز نمونه است و از ارزیابی واقعی یا پاسخ‌های ثبت‌شده به دست نیامده.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-dena-bg p-4 text-center"><p className="text-xs text-dena-muted">پاسخ داده‌شده</p><p className="mt-2 text-xl font-extrabold text-dena-deep">{answeredCount.toLocaleString("fa-IR")} از ۱۰</p></div><div className="rounded-xl bg-dena-bg p-4 text-center"><p className="text-xs text-dena-muted">وضعیت</p><p className="mt-2 font-extrabold text-emerald-700">پایان‌یافته</p></div><div className="rounded-xl bg-dena-bg p-4 text-center"><p className="text-xs text-dena-muted">امتیاز نمایشی</p><p className="mt-2 text-xl font-extrabold text-dena-deep">۸۰٪</p></div></div><div className="rounded-xl border border-dena-border p-4 text-sm leading-7 text-dena-muted">برای دیدن پاسخ‌ها و بازخورد آموزشی، نتیجهٔ معتبر پس از اتصال آزمون به سامانه نمایش داده خواهد شد.</div><div className="flex flex-wrap justify-center gap-3"><Link href="/student-demo/assessments" className={buttonClassName()}>بازگشت به آزمون‌ها</Link><Link href={backHref} className={buttonClassName("outline")}>مشاهده پاسخ‌های نمونه</Link></div></Card><p className="text-xs leading-6 text-dena-muted">اطلاعات این صفحه صرفاً برای نمایش چیدمان نتیجه است.</p></div>;

  if (state === "national") return <div dir="rtl" className="mx-auto max-w-3xl space-y-5"><Card className="space-y-5 rounded-[20px] p-6 md:p-8"><Link href="/student-demo/assessments" className="text-sm font-bold text-dena-brand">بازگشت به تمرین‌ها و آزمون‌ها ←</Link><div><p className="text-sm font-bold text-dena-brand">آزمون جامع · پایه دهم</p><h2 className="mt-2 text-2xl font-extrabold text-dena-deep">آزمون شبیه‌ساز سراسری</h2><p className="mt-2 text-sm leading-7 text-dena-muted">مرور ساختار و آمادگی آزمون جامع</p></div><div className="grid gap-3 sm:grid-cols-3">{[["تعداد پرسش","۶۰"],["زمان پاسخ‌گویی","۹۰ دقیقه"],["وضعیت","آماده‌سازی"]].map(([k,v])=><div key={k} className="rounded-xl bg-dena-bg p-4"><p className="text-xs text-dena-muted">{k}</p><p className="mt-2 font-bold text-dena-deep">{v}</p></div>)}</div><p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">این آزمون هنوز به مخزن پرسش‌ها و زمان‌سنج متصل نیست؛ امکان شروع واقعی فعال نشده است.</p></Card></div>;

  return (
    <div className="mx-auto max-w-[1160px] space-y-5">
      <div dir="ltr" className="grid gap-6 lg:grid-cols-[380px_minmax(0,720px)] lg:justify-center">
        <aside dir="rtl" className="order-2 hidden space-y-5 lg:block lg:order-1">
          <Card className="rounded-2xl p-5"><QuestionMap current={current} answers={answers} answeredCount={answeredCount} goToQuestion={goToQuestion} /></Card>
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
            {showMap && <div className="rounded-2xl border border-dena-border bg-white p-4 lg:hidden"><QuestionMap compact current={current} answers={answers} answeredCount={answeredCount} goToQuestion={goToQuestion} /></div>}

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
