"use client";

import { useState, type FormEvent } from "react";

type Props = {
  callId: string;
  initial?: { summary: string; nextSteps: string[] } | null;
};

export function ServiceCallFollowUpForm({ callId, initial }: Props) {
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [steps, setSteps] = useState(initial?.nextSteps.join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/institute/service-calls/${encodeURIComponent(callId)}/follow-up`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          nextSteps: steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) {
        setMessage(response.status === 400
          ? "خلاصه باید دست‌کم ۱۰ نویسه باشد و حداکثر ۱۰ گام ثبت شود."
          : "ثبت خلاصه انجام نشد؛ وضعیت دسترسی و پایان جلسه را بررسی کنید.");
        return;
      }
      setMessage("خلاصه و گام‌های بعدی برای دانش‌آموز منتشر شد.");
    } catch {
      setMessage("ارتباط برقرار نشد؛ خلاصه هنوز ثبت نشده است.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-dena-lavender bg-white p-4">
    <div>
      <h5 className="font-bold text-dena-deep">خلاصهٔ قابل‌مشاهده برای دانش‌آموز</h5>
      <p className="mt-1 text-xs leading-6 text-dena-muted">
        هرچه اینجا ثبت کنید برای دانش‌آموز قابل مشاهده است. یادداشت خصوصی را وارد نکنید.
      </p>
    </div>
    <label className="block text-sm font-bold text-dena-deep">
      نتیجهٔ جلسه
      <textarea value={summary} onChange={(event) => setSummary(event.target.value)}
        required minLength={10} maxLength={4_000} rows={4}
        className="mt-1 block w-full rounded-xl border border-dena-border bg-white p-3 text-sm font-normal leading-7 outline-none focus:border-dena-brand"
        placeholder="نتیجه و محتوایی را بنویسید که برای دانش‌آموز به اشتراک گذاشته می‌شود." />
    </label>
    <label className="block text-sm font-bold text-dena-deep">
      گام‌های بعدی، هرکدام در یک خط
      <textarea value={steps} onChange={(event) => setSteps(event.target.value)}
        maxLength={3_010} rows={3}
        className="mt-1 block w-full rounded-xl border border-dena-border bg-white p-3 text-sm font-normal leading-7 outline-none focus:border-dena-brand"
        placeholder="اختیاری؛ حداکثر ۱۰ گام" />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={busy || !summary.trim()}
        className="min-h-10 rounded-lg bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال انتشار…" : initial ? "به‌روزرسانی خلاصهٔ منتشرشده" : "انتشار خلاصه برای دانش‌آموز"}
      </button>
      {message && <p role="status" className="text-sm text-dena-muted">{message}</p>}
    </div>
  </form>;
}
