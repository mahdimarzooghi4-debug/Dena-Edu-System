"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export default function EliteClubEvaluationQuestionPreviewPage() {
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");

  function continuePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      answer.trim()
        ? "پاسخ فقط در این پیش‌نمایش باقی می‌ماند و به پروندهٔ واقعی ارسال نمی‌شود."
        : "برای ادامه، پاسخ خود را در کادر بنویسید."
    );
  }

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col gap-5" dir="rtl">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-dena-muted">
            <span>مرحله ۳ از ۶</span>
            <span>۵۰٪</span>
          </div>
          <div
            role="progressbar"
            aria-label="پیشرفت ارزیابی"
            aria-valuemin={0}
            aria-valuemax={6}
            aria-valuenow={3}
            className="h-2 overflow-hidden rounded-full bg-[#ebe8f4]"
          >
            <div className="h-full w-1/2 rounded-full bg-dena-brand" />
          </div>
        </div>

        <header className="space-y-3 text-right">
          <h2 className="text-xl font-extrabold text-dena-ink">ارزیابی باشگاه نخبگان</h2>
          <p className="text-base font-bold leading-7 text-dena-ink">
            سؤال ۳: فکر می‌کنید خلاقیت و کارآفرینی چگونه می‌تواند در بهبود مسیر تحصیلی شما مؤثر باشد؟
          </p>
          <p className="text-sm leading-7 text-dena-muted">پاسخ خود را به صورت تشریحی و خلاصه در کادر زیر بنویسید.</p>
        </header>

        <Card className="rounded-2xl border border-dena-border p-5 sm:p-6">
          <form onSubmit={continuePreview} className="space-y-5">
            <label htmlFor="evaluation-answer" className="sr-only">پاسخ سؤال ۳</label>
            <textarea
              id="evaluation-answer"
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setNotice("");
              }}
              placeholder="پاسخ خود را اینجا بنویسید..."
              className="min-h-[120px] w-full resize-y rounded-xl border border-dena-border bg-white p-3 text-right text-sm leading-7 text-dena-ink outline-none placeholder:text-dena-muted focus:border-dena-brand focus:ring-2 focus:ring-dena-brand/20"
            />

            <div className="flex gap-3">
              <Link
                href="/student-demo/elite-club/register/evaluation"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-dena-border px-5 text-sm font-medium text-dena-ink hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
              >
                قبلی
              </Link>
              <button
                type="submit"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-dena-brand px-5 text-sm font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
              >
                بعدی
              </button>
            </div>
            {notice && <p role="status" className="text-sm leading-6 text-dena-muted">{notice}</p>}
          </form>
        </Card>
      </div>
    </StudentShell>
  );
}
