"use client";

import { useId, useState } from "react";
import { Button } from "../ui/button";

/** A voluntary private learner note: never submitted to a provider or institute. */
export function VideoNote({
  courseId, assetId, title, initialNote,
}: {
  courseId: string; assetId: string; title: string; initialNote: string | null;
}) {
  const inputId = useId();
  const [saved, setSaved] = useState(initialNote);
  const [draft, setDraft] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const url = `/api/student/courses/${courseId}/media/${assetId}/note`;

  async function change(method: "PUT" | "DELETE") {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, {
        method, credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        ...(method === "PUT" ? { body: JSON.stringify({ note: draft }) } : {}),
      });
      if (!response.ok) {
        setError(response.status === 401 || response.status === 404
          ? "دسترسی به این ویدئو تغییر کرده است؛ وضعیت دوره را بررسی کنید."
          : response.status === 400
            ? "یادداشت باید ۱ تا ۲۰۰۰ نویسه و دارای متن باشد."
            : "ذخیرهٔ یادداشت ممکن نشد؛ دوباره تلاش کنید.");
        return;
      }
      const updated = await response.json() as { note: string | null };
      setSaved(updated.note);
      setDraft(updated.note ?? "");
      setNotice(method === "PUT"
        ? "یادداشت شخصی ذخیره شد." : "یادداشت شخصی حذف شد.");
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-dena-bg p-4">
      <label htmlFor={inputId} className="block text-sm font-bold text-dena-deep">
        یادداشت شخصی برای {title}
      </label>
      <textarea id={inputId} value={draft} maxLength={2000} rows={4}
        disabled={busy} onChange={(event) => setDraft(event.target.value)}
        placeholder="نکته‌های خودت را اینجا بنویس؛ این متن فقط برای توست."
        className="w-full rounded-xl border border-dena-border bg-white p-3 text-sm leading-8" />
      <p className="text-xs leading-6 text-dena-muted">
        این یادداشت فقط در حساب خودت قابل مشاهده است؛
        از نوشتن اطلاعات حساس یا نام دیگران خودداری کن.
        حداکثر ۲۰۰۰ نویسه.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy || !draft.trim() ||
          draft.trim() === saved || draft.length > 2000}
          onClick={() => void change("PUT")} className="disabled:opacity-50">
          {busy ? "در حال ذخیره…" : "ذخیره یادداشت شخصی"}
        </Button>
        {saved !== null && (
          <Button type="button" variant="outline" disabled={busy}
            onClick={() => void change("DELETE")} className="disabled:opacity-50">
            حذف یادداشت شخصی
          </Button>
        )}
      </div>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
    </div>
  );
}
