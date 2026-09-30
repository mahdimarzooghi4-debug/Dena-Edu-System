"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

async function patchJson(url: string, body: unknown) {
  return fetch(url, {
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ProblemRequestActions({
  teamMemberId,
  requestId,
  status,
}: {
  teamMemberId: string;
  requestId: string;
  status: "submitted" | "under_review" | "scheduled" | "declined";
}) {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(
    body:
      | { action: "review" }
      | { action: "decline" }
      | { action: "schedule"; scheduledAt: string },
  ) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await patchJson(
        `/api/course-team/assignments/${teamMemberId}/problem-solving/requests/${requestId}`,
        body,
      );
      if (!response.ok) {
        setMessage("این اقدام انجام نشد؛ وضعیت درخواست را دوباره بررسی کنید.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "scheduled" || status === "declined") return null;

  return (
    <div className="mt-4 space-y-3 border-t border-dena-border pt-4">
      <div className="flex flex-wrap gap-2">
        {status === "submitted" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void decide({ action: "review" })}
          >
            در حال بررسی
          </Button>
        )}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void decide({ action: "decline" })}
        >
          قابل انجام نیست
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="space-y-2">
          <span className="block text-xs font-bold text-dena-muted">
            تاریخ و زمان جلسه
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-dena-border px-3 text-sm outline-none focus:border-dena-brand"
          />
        </label>
        <Button
          disabled={busy || !scheduledAt}
          onClick={() => {
            if (!scheduledAt) return;
            const date = new Date(scheduledAt);
            if (Number.isNaN(date.getTime())) {
              setMessage("تاریخ و زمان معتبر نیست.");
              return;
            }
            void decide({
              action: "schedule",
              scheduledAt: date.toISOString(),
            });
          }}
          className="self-end disabled:opacity-50"
        >
          تعیین جلسه
        </Button>
      </div>

      <div role="status" aria-live="polite" className="text-xs text-red-700">
        {message}
      </div>
    </div>
  );
}

export function ProblemSessionActions({
  teamMemberId,
  sessionId,
  status,
}: {
  teamMemberId: string;
  sessionId: string;
  status: "scheduled" | "held" | "cancelled";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (status !== "scheduled") return null;

  async function decide(nextStatus: "held" | "cancelled") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await patchJson(
        `/api/course-team/assignments/${teamMemberId}/problem-solving/sessions/${sessionId}`,
        { status: nextStatus },
      );
      if (!response.ok) {
        setMessage("تغییر وضعیت جلسه انجام نشد.");
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
    <div className="mt-4 border-t border-dena-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void decide("held")}>
          جلسه برگزار شد
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void decide("cancelled")}
        >
          لغو جلسه
        </Button>
      </div>
      <div role="status" aria-live="polite" className="mt-2 text-xs text-red-700">
        {message}
      </div>
    </div>
  );
}
