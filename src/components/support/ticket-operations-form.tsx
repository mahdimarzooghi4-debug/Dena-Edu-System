"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

const statusOptions = [
  ["new", "جدید"],
  ["in_progress", "در حال رسیدگی"],
  ["waiting_requester", "منتظر پاسخ کاربر"],
  ["resolved", "حل‌شده"],
  ["closed", "بسته"],
] as const;
const priorityOptions = [
  ["low", "پایین"],
  ["normal", "عادی"],
  ["high", "بالا"],
  ["urgent", "فوری"],
] as const;

export function TicketOperationsForm({
  ticketId,
  initialStatus,
  initialPriority,
}: {
  ticketId: string;
  initialStatus: (typeof statusOptions)[number][0];
  initialPriority: (typeof priorityOptions)[number][0];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, priority }),
      });
      if (!response.ok) throw new Error();
      setMessage("وضعیت و اولویت ذخیره شد.");
      router.refresh();
    } catch {
      setError("تغییرات ذخیره نشد؛ دسترسی و اتصال را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          <span>وضعیت</span>
          <select value={status} onChange={(event) =>
            setStatus(event.target.value as typeof status)}
            className="w-full rounded-xl border border-dena-border bg-white px-3 py-3">
            {statusOptions.map(([value, label]) =>
              <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold">
          <span>اولویت</span>
          <select value={priority} onChange={(event) =>
            setPriority(event.target.value as typeof priority)}
            className="w-full rounded-xl border border-dena-border bg-white px-3 py-3">
            {priorityOptions.map(([value, label]) =>
              <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs leading-6 text-dena-muted">
        با انتخاب «منتظر پاسخ کاربر»، زمان SLA حل متوقف می‌شود. پیام تازهٔ کاربر تیکت حل‌شده یا بسته را دوباره باز می‌کند.
      </p>
      {message && <p role="status" className="text-sm font-semibold text-green-800">{message}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "در حال ذخیره…" : "ذخیرهٔ وضعیت و اولویت"}
      </Button>
    </form>
  );
}
