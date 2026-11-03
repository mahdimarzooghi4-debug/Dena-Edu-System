"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../ui/button";

export function TicketCreateForm() {
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
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.get("subject"),
          body: form.get("body"),
        }),
      });
      const result = await response.json() as { ticket?: { id: string } };
      if (!response.ok || !result.ticket?.id) throw new Error();
      router.push(`/support/${result.ticket.id}`);
      router.refresh();
    } catch {
      setError("ثبت درخواست انجام نشد؛ ورودی‌ها را بررسی و دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2 text-sm font-semibold">
        <span>موضوع درخواست</span>
        <input name="subject" required minLength={3} maxLength={120}
          className="min-h-12 w-full rounded-xl border border-dena-border px-4 outline-none focus:border-dena-brand"
          autoComplete="off" placeholder="موضوع خود را وارد کنید..." />
      </label>
      <label className="block space-y-2 text-sm font-semibold">
        <span>پیام شما</span>
        <textarea name="body" required maxLength={5000} rows={5} placeholder="شرح مشکل یا سؤال خود را به طور کامل بنویسید..."
          className="w-full resize-y rounded-xl border border-dena-border px-4 py-3 leading-7 outline-none focus:border-dena-brand" />
      </label>
      <p className="text-xs leading-6 text-dena-muted">
        برای حفاظت از حریم خصوصی، رمز، کد ورود، شمارهٔ کارت یا یادداشت خصوصی آموزشی را ننویسید.
      </p>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-row gap-3 pt-1">
        <Link href="/support" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-dena-border px-4 text-sm font-bold text-dena-deep hover:bg-dena-bg">انصراف</Link>
        <Button type="submit" disabled={busy} className="flex-1">{busy ? "در حال ثبت…" : "ارسال درخواست"}</Button>
      </div>
    </form>
  );
}
