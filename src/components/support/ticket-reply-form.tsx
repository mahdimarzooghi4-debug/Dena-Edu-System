"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: form.get("body") }),
      });
      if (!response.ok) throw new Error();
      formElement.reset();
      router.refresh();
    } catch {
      setError("پیام ثبت نشد؛ دسترسی یا متن پیام را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-2 text-sm font-semibold">
        <span>پاسخ</span>
        <textarea name="body" required maxLength={5000} rows={4}
          className="w-full resize-y rounded-xl border border-dena-border px-4 py-3 leading-7 outline-none focus:border-dena-brand" />
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "در حال ارسال…" : "ارسال پیام"}</Button>
    </form>
  );
}
