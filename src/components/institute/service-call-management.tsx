"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ServiceCall = {
  id: string;
  scheduledAt: string;
  status: "scheduled" | "started" | "ended" | "cancelled";
};

type Props = {
  orderId: string;
  orderStatus: string;
  remainingMinutes: number;
  calls: ServiceCall[];
};

const statusLabel: Record<ServiceCall["status"], string> = {
  scheduled: "زمان‌بندی‌شده",
  started: "شروع‌شده",
  ended: "پایان‌یافته",
  cancelled: "لغوشده",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
});

export function InstituteServiceCallManagement({
  orderId, orderStatus, remainingMinutes, calls,
}: Props) {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const openCall = calls.some((call) => call.status === "scheduled" || call.status === "started");
  const canSchedule = orderStatus === "paid" && remainingMinutes > 0 && !openCall;

  async function schedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !scheduledAt) return;
    const selectedAt = new Date(scheduledAt);
    if (!Number.isFinite(selectedAt.getTime()) || selectedAt.getTime() <= Date.now()) {
      setMessage("زمان جلسه باید در آینده باشد.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/institute/service-orders/${encodeURIComponent(orderId)}/calls`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: selectedAt.toISOString(),
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setMessage(body?.error === "service_not_ready" || body?.error === "quota_empty"
          ? "این درخواست برای زمان‌بندی جلسه آماده نیست."
          : "زمان‌بندی انجام نشد؛ وضعیت سفارش و سهمیه را بررسی کنید.");
        return;
      }
      setScheduledAt("");
      setMessage("زمان جلسه ثبت شد.");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function transition(callId: string, action: "start" | "end" | "cancel") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/institute/service-calls/${encodeURIComponent(callId)}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setMessage(body?.error === "call_too_early"
          ? "شروع جلسه پس از زمان برنامه‌ریزی‌شده ممکن است."
          : "تغییر وضعیت جلسه انجام نشد؛ صفحه را تازه کنید و دوباره تلاش کنید.");
        return;
      }
      setMessage(action === "start" ? "جلسه شروع شد."
        : action === "end" ? "پایان جلسه ثبت شد." : "جلسه لغو شد.");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="مدیریت جلسه‌های خدمت" className="space-y-3 rounded-xl border border-dena-lavender p-4">
    <div>
      <h4 className="text-sm font-extrabold text-dena-deep">جلسه‌های خدمت</h4>
      <p className="mt-1 text-xs leading-6 text-dena-muted">
        این بخش فقط زمان و وضعیت جلسه را ثبت می‌کند؛ تماس زنده هنوز فعال نیست.
      </p>
    </div>
    {calls.length > 0 ? <ul className="space-y-3">
      {calls.map((call) => <li key={call.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-dena-bg p-3">
        <p className="text-sm text-dena-deep">
          {dateFormatter.format(new Date(call.scheduledAt))} · {statusLabel[call.status]}
        </p>
        <div className="flex flex-wrap gap-2">
          {call.status === "scheduled" && <>
            <button type="button" disabled={busy} onClick={() => void transition(call.id, "start")}
              className="min-h-10 rounded-lg bg-dena-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              شروع جلسه
            </button>
            <button type="button" disabled={busy} onClick={() => void transition(call.id, "cancel")}
              className="min-h-10 rounded-lg border border-dena-line px-3 py-2 text-xs font-bold text-dena-deep disabled:opacity-50">
              لغو جلسه
            </button>
          </>}
          {call.status === "started" && <button type="button" disabled={busy}
            onClick={() => void transition(call.id, "end")}
            className="min-h-10 rounded-lg bg-dena-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            ثبت پایان جلسه
          </button>}
        </div>
      </li>)}
    </ul> : <p className="text-sm text-dena-muted">برای این سفارش هنوز جلسه‌ای ثبت نشده است.</p>}
    {canSchedule && <form onSubmit={(event) => void schedule(event)} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="grid gap-2 text-sm font-semibold text-dena-deep">
        زمان جلسه
        <input type="datetime-local" required value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          className="min-h-11 rounded-lg border border-dena-line bg-white px-3 py-2" />
      </label>
      <button type="submit" disabled={busy || !scheduledAt}
        className="min-h-11 rounded-lg bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال ثبت…" : "زمان‌بندی جلسه"}
      </button>
    </form>}
    {orderStatus === "paid" && remainingMinutes <= 0 && !openCall &&
      <p className="text-xs text-dena-muted">برای زمان‌بندی جلسه، ماندهٔ سهمیه باید بیشتر از صفر باشد.</p>}
    {message && <p role="status" className="text-sm font-semibold text-dena-deep">{message}</p>}
  </section>;
}
