"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  kind: "ticket_created" | "requester_replied" | "support_replied" | "ticket_updated" | "attachment_added" | "attachment_scanned";
  readAt: string | null;
  createdAt: string;
  ticketId: string;
  subject: string;
};

const labels: Record<Notification["kind"], string> = {
  ticket_created: "درخواست تازه به صف پشتیبانی ارجاع شد",
  requester_replied: "درخواست‌دهنده پیام تازه فرستاد",
  support_replied: "پشتیبانی به درخواستت پاسخ داد",
  ticket_updated: "وضعیت یا اولویت تیکت تغییر کرد",
  attachment_added: "فایل تازه‌ای به تیکت پیوست شد",
  attachment_scanned: "بررسی امنیتی فایل پیوست تکمیل شد",
};

export function SupportNotifications({ detailBase = "/support" }: { detailBase?: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/support/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return await response.json() as { notifications: Notification[] };
      })
      .then(({ notifications }) => { if (active) setItems(notifications); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [retry]);

  async function markRead(id: string) {
    if (busyId) return;
    setBusyId(id); setError(false);
    try {
      const response = await fetch(`/api/support/notifications/${id}`, {
        method: "PATCH", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("notification_unavailable");
      setItems((current) => current.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch { setError(true); }
    finally { setBusyId(null); }
  }

  return (
    <section aria-labelledby="support-notification-heading" className="space-y-3">
      <h2 id="support-notification-heading" className="text-lg font-bold">اعلان‌های پشتیبانی</h2>
      {error && <p role="alert" className="text-sm text-red-700">اعلان‌ها بارگذاری یا به‌روزرسانی نشدند.</p>}
      {error && <button type="button" disabled={Boolean(busyId) || !loaded} onClick={() => {
        setLoaded(false); setError(false); setRetry((value) => value + 1);
      }} className="rounded-lg border border-dena-border px-3 py-2 text-xs font-bold text-dena-brand">دریافت دوبارهٔ اعلان‌ها</button>}
      {!loaded && <p role="status" className="text-sm text-dena-muted">در حال دریافت اعلان‌ها…</p>}
      {loaded && !error && items.length === 0 ? (
        <p className="rounded-xl border border-dena-border bg-white p-4 text-sm text-dena-muted">
          اعلان تازه‌ای نداری.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 10).map((item) => (
            <li key={item.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 ${item.readAt ? "border-dena-border" : "border-dena-brand/40"}`}>
              <div>
                <p className="text-sm font-bold">{labels[item.kind]}</p>
                <Link href={`${detailBase}/${item.ticketId}`} className="mt-1 inline-block text-sm text-dena-brand underline-offset-4 hover:underline">
                  {item.subject}
                </Link>
                <p className="mt-1 text-xs text-dena-muted">
                  {new Date(item.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
                </p>
              </div>
              {!item.readAt && (
                <button type="button" disabled={Boolean(busyId)} onClick={() => void markRead(item.id)}
                  className="rounded-lg border border-dena-border px-3 py-2 text-xs font-bold text-dena-deep hover:bg-dena-bg">
                  {busyId === item.id ? "در حال ثبت…" : "خواندم"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
