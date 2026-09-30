"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProblemSolvingRequestForm({
  courseId,
  teamMemberId,
}: {
  courseId: string;
  teamMemberId: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (busy || trimmedSubject.length < 3) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/student/courses/${courseId}/team/${teamMemberId}/problem-solving`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: trimmedSubject,
            ...(trimmedDescription ? { description: trimmedDescription } : {}),
          }),
        },
      );

      if (!response.ok) {
        setMessage(response.status === 404
          ? "درخواست جلسه در حال حاضر برای این پشتیبان فعال نیست."
          : "ثبت درخواست انجام نشد؛ دوباره تلاش کنید.");
        return;
      }

      setSubject("");
      setDescription("");
      setMessage("درخواست جلسه ثبت شد.");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold">موضوع درخواست</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={160}
          className="min-h-12 w-full rounded-xl border border-dena-border bg-white px-4 text-sm outline-none focus:border-dena-brand"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-bold">توضیح کوتاه</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full resize-y rounded-xl border border-dena-border bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-dena-brand"
        />
      </label>

      <Button
        type="button"
        disabled={busy || subject.trim().length < 3}
        onClick={() => void submit()}
        className="disabled:opacity-50"
      >
        {busy ? "در حال ثبت…" : "ثبت درخواست"}
      </Button>

      <div role="status" aria-live="polite" className="text-sm leading-7 text-dena-muted">
        {message}
      </div>
    </div>
  );
}
