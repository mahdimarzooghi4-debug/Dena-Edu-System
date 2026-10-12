"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ServiceOrderConsent({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!confirmed || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/institute/service-orders/${encodeURIComponent(orderId)}/consent`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consentConfirmed: true }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.order) {
        setMessage("ثبت تأیید انجام نشد؛ وضعیت درخواست را تازه کنید.");
        return;
      }
      setConfirmed(false);
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={confirmed}
        onChange={(event) => setConfirmed(event.target.checked)}
        className="mt-2 size-4 accent-dena-brand"
      />
      <span>تأیید می‌کنم رضایت سرپرست برای همین درخواست خدمت اخذ شده است.</span>
    </label>
    <button
      type="button"
      disabled={!confirmed || busy}
      onClick={() => void submit()}
      className="min-h-10 rounded-lg bg-dena-brand px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "در حال ثبت…" : "ثبت تأیید رضایت"}
    </button>
    {message && <p role="alert" className="text-xs font-semibold text-red-700">{message}</p>}
  </div>;
}
