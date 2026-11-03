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
    if (busy) return;
    if (!trimmed) {
      setMessage("متن پیام را وارد کنید.");
      return;
    }

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
    <div className="w-full">
      <section aria-label="ارسال پیام در گفت‌وگو" className="h-[116px] rounded-[16px] border border-dena-border bg-white p-[13px] md:h-auto md:rounded-[22px] md:p-4">
        <label className="block">
          <span className="sr-only">پیام خود را بنویسید</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            rows={1}
            placeholder="پیام خود را بنویسید..."
            className="h-6 min-h-6 w-full resize-none rounded-none bg-transparent px-0 py-0 text-[12px] leading-6 outline-none placeholder:text-dena-muted focus:ring-0 md:h-auto md:min-h-12 md:py-2 md:text-sm"
          />
        </label>
        <div className="mt-5 flex h-[34px] items-center justify-between gap-2 md:mt-3 md:h-auto md:border-t md:border-dena-border md:pt-3">
          <p className="min-w-0 flex-1 text-right text-[10px] leading-[17px] text-dena-muted md:text-xs md:leading-6">
            گفت‌وگو فقط در چارچوب همین دوره است.
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="h-[34px] min-h-[34px] w-[108px] shrink-0 rounded-full px-3 py-1 text-[13px] font-bold disabled:opacity-60"
          >
            {busy ? "در حال ارسال…" : "ارسال"}
          </Button>
        </div>
      </section>
      {message && (
        <p role="status" aria-live="polite" className="mt-2 text-xs leading-6 text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}
