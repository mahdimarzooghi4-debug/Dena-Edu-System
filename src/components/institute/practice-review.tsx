"use client";

import { useState } from "react";
import { Button } from "../ui/button";

export function InstitutePracticeReview({
  courseId,
}: { courseId: string }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(action: "approve" | "reject") {
    if (busy || reason.trim().length < 15) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/institute/courses/${courseId}/practice`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        },
      );
      if (!response.ok) {
        setMessage(response.status === 409
          ? "برای این سؤال قبلاً تصمیم نهایی ثبت شده است."
          : "ثبت تصمیم ممکن نشد؛ محدودهٔ مؤسسه یا وضعیت دوره را بررسی کنید.");
        return;
      }
      setMessage(action === "approve"
        ? "سؤال تمرینی برای نمایش به دانش‌آموزان این دوره تأیید شد."
        : "سؤال تمرینی رد شد و به دانش‌آموزان نمایش داده نمی‌شود.");
      window.location.reload();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label htmlFor="practice-review-reason"
        className="block text-sm font-bold text-dena-deep">
        دلیل تصمیم مؤسسه
      </label>
      <textarea id="practice-review-reason" value={reason} rows={4}
        maxLength={500} disabled={busy}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-xl border border-dena-border bg-white p-3 text-sm leading-8"
        placeholder="حداقل ۱۵ نویسه؛ دلیل تأیید یا رد همین سؤال را ثبت کنید." />
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy || reason.trim().length < 15}
          onClick={() => void decide("approve")}
          className="disabled:opacity-50">
          تأیید سؤال تمرینی
        </Button>
        <Button type="button" variant="outline"
          disabled={busy || reason.trim().length < 15}
          onClick={() => void decide("reject")}
          className="disabled:opacity-50">
          رد سؤال تمرینی
        </Button>
      </div>
      <div role="status" aria-live="polite"
        className="text-sm leading-7 text-dena-muted">
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
