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
    if (busy) return;
    if (trimmedSubject.length < 3) {
      setMessage("موضوع درخواست باید دست‌کم ۳ نویسه داشته باشد.");
      return;
    }

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
    <div className="flex flex-col items-stretch">
      <label className="block">
        <span className="block h-[22px] text-[13px] font-bold leading-[22px] text-dena-deep">موضوع درخواست</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={160}
          placeholder="مثلاً: سؤال درباره نمودار تابع درجه دو"
          className="mt-[10px] h-[54px] w-full rounded-[16px] border border-dena-border bg-white px-4 text-[11px] text-dena-deep outline-none placeholder:text-dena-muted focus:border-dena-brand"
        />
      </label>

      <label className="mt-5 block">
        <span className="block h-[22px] text-[13px] font-bold leading-[22px] text-dena-deep">توضیح کوتاه</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="در صورت نیاز، توضیح کوتاهی درباره موضوع رفع اشکال بنویسید."
          className="mt-[10px] h-[118px] w-full resize-none rounded-[16px] border border-dena-border bg-white px-4 py-3 text-[11px] leading-6 text-dena-deep outline-none placeholder:text-dena-muted focus:border-dena-brand"
        />
      </label>

      <p className="mt-5 h-5 text-[11px] leading-5 text-dena-muted">
        ثبت درخواست به معنای تعیین قطعی جلسه نیست.
      </p>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-[18px] h-[42px] min-h-[42px] w-full rounded-full px-5 py-2 text-[13px] font-bold disabled:opacity-60"
      >
        {busy ? "در حال ثبت…" : "ثبت درخواست"}
      </Button>

      <div role="status" aria-live="polite" className="mt-2 text-xs leading-6 text-dena-muted">
        {message}
      </div>
      <p className="mt-2 h-[42px] text-[11px] leading-[21px] text-dena-muted">
        زمان جلسه در صورت تعیین، در همین بخش نمایش داده می‌شود.
      </p>
    </div>
  );
}
