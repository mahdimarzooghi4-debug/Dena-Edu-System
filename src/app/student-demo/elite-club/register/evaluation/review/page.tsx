"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

const answers = ["۱", "۲", "۳", "۴", "۵", "۶"];

export default function EliteClubEvaluationReviewPreviewPage() {
  const [notice, setNotice] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col gap-5" dir="rtl">
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink">مرور پاسخ‌ها</h2>
          <p className="text-sm leading-7 text-dena-muted">پاسخ‌های ثبت‌شده را مرور کرده و در صورت نیاز ویرایش کنید.</p>
        </header>

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          این صفحه پیش‌نمایش است؛ پاسخ‌های فهرست نمونه‌اند و پاسخی در پروندهٔ واقعی ثبت نشده است.
        </p>

        <Card className="space-y-3 rounded-2xl border border-dena-border p-4 sm:p-5">
          <ol className="space-y-2">
            {answers.map((number) => (
              <li key={number} className="rounded-xl border border-dena-border bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-dena-ink">سؤال {number} ارزیابی عضویت</h3>
                  {number === "۳" ? (
                    <Link href="/student-demo/elite-club/register/evaluation/question" className="shrink-0 text-xs font-bold text-dena-brand hover:underline">
                      ویرایش پاسخ
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNotice(`ویرایش سؤال ${number} در این پیش‌نمایش آماده نشده است.`)}
                      className="shrink-0 text-xs font-bold text-dena-brand hover:underline"
                    >
                      ویرایش پاسخ
                    </button>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-dena-muted">
                  پاسخ داده‌شده به این سؤال به صورت خلاصه در اینجا قرار می‌گیرد...
                </p>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-6 text-sm font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
          >
            ثبت نهایی ارزیابی
          </button>
          {notice && <p role="status" className="text-sm leading-6 text-dena-muted">{notice}</p>}
        </Card>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45"
          onClick={() => setShowConfirm(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="evaluation-submit-title"
            className="w-full rounded-t-[24px] bg-white px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="mx-auto max-w-md space-y-3 text-right">
              <h2 id="evaluation-submit-title" className="text-lg font-extrabold text-dena-ink">ارزیابی ثبت شود؟</h2>
              <p className="text-sm leading-7 text-dena-muted">پس از ثبت نهایی، پاسخ‌های این ارزیابی ارسال می‌شوند.</p>
              <p className="text-xs leading-6 text-amber-800">در پیش‌نمایش، پاسخی ارسال یا ذخیره نمی‌شود.</p>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setNotice("ارسال نهایی در پیش‌نمایش انجام نشد؛ پاسخی به پروندهٔ واقعی نرفت.");
                  }}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-6 text-sm font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
                >
                  ثبت نهایی
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-dena-border px-6 text-sm font-medium text-dena-ink hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
                >
                  بازگشت به ارزیابی
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </StudentShell>
  );
}
