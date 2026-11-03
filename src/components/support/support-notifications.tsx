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

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return \`\${minutes.toLocaleString("fa-IR")} دقیقه پیش\`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return \`\${hours.toLocaleString("fa-IR")} ساعت پیش\`;
  return \`\${Math.floor(hours / 24).toLocaleString("fa-IR")} روز پیش\`;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" className="size-10 text-dena-brand" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
}

export function SupportNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

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
  }, []);

  async function markRead(id: string) {
    const response = await fetch(\`/api/support/notifications/\${id}\`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (response.ok) {
      setItems((current) => current.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } else setError(true);
  }

  return (
    <section aria-labelledby="student-notifications-heading">
      <h2 id="student-notifications-heading" className="sr-only">اعلان‌ها</h2>
      <p className="mb-4 text-xs leading-6 text-dena-muted">اعلان‌های ثبت‌شده برای درخواست‌های پشتیبانی اینجا نمایش داده می‌شوند.</p>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">اعلان‌ها بارگذاری یا به‌روزرسانی نشدند.</p>}
      {loaded && items.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[22px] border border-dena-border bg-white px-6 py-10 text-center">
          <BellIcon />
          <h3 className="mt-4 text-base font-extrabold text-dena-deep">اعلان جدیدی نداری</h3>
          <p className="mt-2 max-w-sm text-sm leading-7 text-dena-muted">وقتی دربارهٔ درخواست پشتیبانی‌ات پیام تازه‌ای ثبت شود، اینجا می‌بینی.</p>
        </div>
      ) : !loaded ? (
        <div className="space-y-3" aria-label="در حال بارگذاری اعلان‌ها">
          {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-dena-bg" />)}
        </div>
      ) : (
        <ul className="divide-y divide-dena-border overflow-hidden rounded-[22px] border border-dena-border bg-white">
          {items.slice(0, 10).map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <span className={\`mt-1.5 size-2 shrink-0 rounded-full \${item.readAt ? "bg-transparent" : "bg-dena-brand"}\`} aria-label={item.readAt ? "خوانده‌شده" : "خوانده‌نشده"} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-6 text-dena-deep">{labels[item.kind]}</p>
                <Link href={\`/support/\${item.ticketId}\`} className="mt-1 inline-block text-sm text-dena-brand underline-offset-4 hover:underline">{item.subject}</Link>
                <p className="mt-1 text-xs text-dena-muted">{relativeTime(item.createdAt)}</p>
              </div>
              {!item.readAt && <button type="button" onClick={() => void markRead(item.id)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-dena-brand hover:bg-dena-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-dena-brand">خواندم</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
