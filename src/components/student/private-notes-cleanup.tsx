"use client";

import { useId, useState } from "react";
import { Button } from "../ui/button";

const confirmation = "حذف همه یادداشت‌ها";

/** Explicit destructive action: no mutation on mount, GET or field change. */
export function PrivateNotesCleanup({ initialCount }: { initialCount: number }) {
  const inputId = useId();
  const [noteCount, setNoteCount] = useState(initialCount);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function deleteNotes() {
    if (busy || noteCount === 0 || typed !== confirmation) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/student/private-notes", {
        method: "DELETE", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_MY_VIDEO_NOTES" }),
      });
      if (!response.ok) {
        setError(response.status === 401 || response.status === 403
          ? "نشست یا دسترسی تغییر کرده است؛ دوباره وارد حساب خودت شو."
          : "حذف یادداشت‌ها ممکن نشد؛ دوباره تلاش کن.");
        return;
      }
      const result = await response.json() as {
        deleted: number; noteCount: number;
      };
      setNoteCount(result.noteCount);
      setTyped("");
      setNotice(result.noteCount === 0
        ? `${result.deleted.toLocaleString("fa-IR")} یادداشت از پایگاه دادهٔ فعال حذف شد.`
        : "تعداد یادداشت‌ها به‌روز شد. ممکن است هم‌زمان یادداشت تازه‌ای ذخیره شده باشد.");
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-dena-border bg-white p-6"
      aria-labelledby="notes-cleanup">
      <h2 id="notes-cleanup" className="text-xl font-extrabold leading-9">
        پاک‌کردن همهٔ یادداشت‌های شخصی
      </h2>
      <p className="text-sm leading-8 text-dena-muted">
        تعداد واقعی یادداشت‌های ذخیره‌شده برای این حساب، از جمله یادداشتِ
        ویدئوهایی که دیگر به آن‌ها دسترسی نداری:{" "}
        <strong className="text-dena-deep">
          {noteCount.toLocaleString("fa-IR")}
        </strong>
      </p>
      <p className="text-sm leading-8 text-dena-muted">
        این اقدام همهٔ متن یادداشت‌های ویدئویی متعلق به حساب تو را
        از پایگاه دادهٔ فعال حذف می‌کند و از داخل برنامه قابل بازگردانی نیست.
        ثبت‌نام‌ها و علامت‌های «انجام‌شده» تغییر نمی‌کنند.
        این گزینه حذف همهٔ داده‌های حساب یا نسخه‌های پشتیبان نیست.
      </p>
      {noteCount > 0 && (
        <div className="space-y-3">
          <label htmlFor={inputId} className="block text-sm font-semibold">
            برای تأیید، عبارت «{confirmation}» را دقیقاً وارد کن
          </label>
          <input id={inputId} type="text" value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off" disabled={busy}
            className="w-full rounded-xl border border-dena-border p-3 text-sm"
            aria-describedby={inputId + "-hint"} />
          <p id={inputId + "-hint"} className="text-xs text-dena-muted">
            صرف واردکردن عبارت چیزی را حذف نمی‌کند؛ دکمه را هم باید بزنی.
          </p>
          <Button type="button" disabled={busy || typed !== confirmation}
            onClick={() => void deleteNotes()} className="disabled:opacity-50">
            {busy ? "در حال پاک‌کردن…" : "حذف همه یادداشت‌ها"}
          </Button>
        </div>
      )}
      {noteCount === 0 && (
        <p className="text-sm text-dena-muted">
          یادداشت ویدئویی ذخیره‌شده‌ای برای پاک‌کردن باقی نمانده است.
        </p>
      )}
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
    </section>
  );
}
