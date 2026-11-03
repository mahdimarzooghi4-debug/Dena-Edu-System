"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CourseConversationComposer({
  courseId,
  teamMemberId,
}: {
  courseId: string;
  teamMemberId: string;
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
        `/api/student/courses/${courseId}/team/${teamMemberId}/conversation`,
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
          ? "این گفت‌وگو دیگر در دسترس نیست."
          : "ارسال پیام انجام نشد؛ دوباره تلاش کنید.");
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
    <section aria-label="ارسال پیام در گفت‌وگو" className="rounded-[22px] border border-dena-border bg-white p-3">
      <label className="block">
        <span className="sr-only">پیام خود را بنویسید</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="پیام خود را بنویسید..."
          className="min-h-12 w-full resize-y rounded-xl bg-transparent px-2 py-1 text-sm leading-6 outline-none placeholder:text-dena-muted focus:ring-1 focus:ring-dena-brand"
        />
      </label>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-dena-border pt-2">
        <p className="text-[10px] leading-5 text-dena-muted">
          گفت‌وگو فقط در چارچوب همین دوره است.
        </p>
        <Button
          type="button"
          disabled={busy || body.trim().length === 0}
          onClick={() => void submit()}
          className="min-h-10 w-[108px] shrink-0 disabled:opacity-50"
        >
          {busy ? "در حال ارسال…" : "ارسال"}
        </Button>
      </div>
      {message && <p role="status" aria-live="polite" className="mt-2 text-sm text-red-700">{message}</p>}
    </section>
  );
}
