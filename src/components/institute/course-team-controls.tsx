"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CourseTeamSessionPolicyControl({
  courseId,
  teamMemberId,
  enabled,
}: {
  courseId: string;
  teamMemberId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(nextEnabled: boolean) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/institute/courses/${courseId}/team/${teamMemberId}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled }),
        },
      );
      if (!response.ok) {
        setMessage("تغییر تنظیم انجام نشد؛ دوباره تلاش کنید.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-dena-bg p-4">
      <p className="text-xs font-bold text-dena-muted">
        درخواست جلسه رفع اشکال توسط دانش‌آموز
      </p>
      <p className="mt-2 text-sm font-bold text-dena-deep">
        {enabled ? "فعال" : "غیرفعال"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={enabled ? "outline" : "primary"}
          disabled={busy || enabled}
          onClick={() => void update(true)}
        >
          فعال‌کردن
        </Button>
        <Button
          type="button"
          variant={!enabled ? "outline" : "secondary"}
          disabled={busy || !enabled}
          onClick={() => void update(false)}
        >
          غیرفعال‌کردن
        </Button>
      </div>
      <div role="status" aria-live="polite" className="mt-2 text-xs text-red-700">
        {message}
      </div>
    </div>
  );
}
