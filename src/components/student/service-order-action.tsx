"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderStatus = "awaiting_guardian_consent" | "awaiting_payment" | "paid" | "cancelled";
type Order = { id: string; status: OrderStatus };

export function ServiceOrderAction({ serviceId, guardianConsentRequired, order, allowRetry = true }: {
  serviceId: string; guardianConsentRequired: boolean; order?: Order; allowRetry?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(order);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createRequest() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/services/${encodeURIComponent(serviceId)}/orders`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.order) {
        setMessage(body?.error === "order_pending_exists"
          ? "برای این خدمت یک درخواست باز دارید."
          : "درخواست ثبت نشد؛ صفحه را تازه کنید و دوباره تلاش کنید.");
        return;
      }
      setCurrent(body.order as Order);
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    if (!current || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/services/orders/${encodeURIComponent(current.id)}/cancel`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.order) {
        setMessage("لغو درخواست انجام نشد؛ وضعیت را تازه کنید.");
        return;
      }
      setCurrent(body.order as Order);
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  if (current?.status === "paid") return <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800">پرداخت این خدمت ثبت شده است.</p>;
  if (current?.status === "awaiting_guardian_consent") return <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">
    <p>درخواست ثبت شده و منتظر رضایت سرپرست است. تا ثبت رضایت معتبر، پرداخت یا ارائهٔ خدمت انجام نمی‌شود.</p>
    <button type="button" disabled={busy} onClick={() => void cancelRequest()} className="font-bold underline disabled:opacity-50">{busy ? "در حال انجام…" : "لغو درخواست"}</button>
  </div>;
  if (current?.status === "awaiting_payment") return <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">
    <p>درخواست ثبت شده؛ اتصال درگاه پرداخت هنوز آماده نیست و هیچ مبلغی دریافت نشده است.</p>
    <button type="button" disabled={busy} onClick={() => void cancelRequest()} className="font-bold underline disabled:opacity-50">{busy ? "در حال انجام…" : "لغو درخواست"}</button>
  </div>;
  if (current?.status === "cancelled" && !allowRetry) return <p className="rounded-lg bg-slate-100 p-3 text-sm font-bold text-slate-700">این درخواست لغو شده است.</p>;
  return <div className="space-y-2">
    <button type="button" disabled={busy} onClick={() => void createRequest()} className="min-h-11 rounded-xl bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
      {busy ? "در حال ثبت…" : current?.status === "cancelled" ? "ثبت درخواست دوباره" : "درخواست این خدمت"}
    </button>
    {guardianConsentRequired && <p className="text-xs leading-6 text-dena-muted">ابتدا رضایت سرپرست ثبت می‌شود؛ سپس پرداخت قابل پیگیری خواهد بود.</p>}
    {message && <p role="alert" className="text-xs font-semibold text-red-700">{message}</p>}
  </div>;
}
