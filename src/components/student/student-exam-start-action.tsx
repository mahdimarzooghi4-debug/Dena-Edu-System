"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StudentExamStartAction({ examId, label }: { examId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/exams/" + encodeURIComponent(examId) + "/attempts", {
        method: "POST", credentials: "same-origin", cache: "no-store",
      });
      const result = await response.json() as { attemptId?: string; error?: string };
      if (!response.ok || !result.attemptId) {
        setMessage(result.error === "outside_schedule"
          ? "زمان شرکت در آزمون به پایان رسیده است."
          : "شروع آزمون ممکن نشد؛ زمان‌بندی و دسترسی را بررسی کنید.");
        return;
      }
      router.push("/student/exams/" + encodeURIComponent(examId) +
        "/attempt/" + encodeURIComponent(result.attemptId));
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-5 text-sm font-bold text-white hover:bg-dena-deep">
      {label}
    </button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="exam-start-title"
        className="w-full max-w-md space-y-4 rounded-[22px] bg-white p-6 shadow-xl">
        <h2 id="exam-start-title" className="text-xl font-extrabold text-dena-deep">آماده‌ای آزمون را شروع کنی؟</h2>
        <p className="text-sm leading-7 text-dena-muted">
          پس از شروع، زمان آزمون محاسبه می‌شود و پاسخ‌ها هنگام انتخاب ذخیره خواهند شد.
        </p>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={() => setOpen(false)}
            className="min-h-11 rounded-xl border border-dena-border px-4 text-sm font-bold text-dena-deep">بازگشت</button>
          <button type="button" disabled={busy} onClick={() => void start()}
            className="min-h-11 rounded-xl bg-dena-brand px-4 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "در حال شروع…" : "شروع آزمون"}
          </button>
        </div>
      </section>
    </div>}
  </>;
}
