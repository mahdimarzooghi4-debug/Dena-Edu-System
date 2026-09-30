"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CourseTeamReplyComposer({
  teamMemberId,
  conversationId,
}: {
  teamMemberId: string;
  conversationId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/course-team/assignments/${teamMemberId}/conversations/${conversationId}`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        },
      );

      if (!response.ok) {
        setMessage(response.status === 404
          ? "این گفت‌وگو یا دسترسی شما دیگر فعال نیست."
          : "ارسال پاسخ انجام نشد؛ دوباره تلاش کنید.");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">پاسخ خود را بنویسید</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={4}
          placeholder="پاسخ خود را بنویسید..."
          className="w-full resize-y rounded-2xl border border-dena-border bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-dena-brand"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-dena-muted">
          فقط برای ارتباط آموزشی در محدوده همین دوره
        </p>
        <Button
          type="button"
          disabled={busy || body.trim().length === 0}
          onClick={() => void submit()}
          className="disabled:opacity-50"
        >
          {busy ? "در حال ارسال…" : "ارسال پاسخ"}
        </Button>
      </div>

      <div role="status" aria-live="polite" className="text-sm text-red-700">
        {message}
      </div>
    </div>
  );
}
