"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

type DemoNotification = {
  id: string;
  label: string;
  subject: string;
  time: string;
  read: boolean;
};

const initialNotifications: DemoNotification[] = [
  {
    id: "demo-support-reply",
    label: "پشتیبانی به درخواستت پاسخ داد",
    subject: "پرسش نمونه دربارهٔ ورود به دوره",
    time: "زمان نمونه · امروز",
    read: false,
  },
  {
    id: "demo-ticket-update",
    label: "وضعیت یا اولویت تیکت تغییر کرد",
    subject: "پیگیری نمونهٔ درخواست پشتیبانی",
    time: "زمان نمونه · دیروز",
    read: true,
  },
  {
    id: "demo-attachment-scanned",
    label: "بررسی امنیتی فایل پیوست تکمیل شد",
    subject: "تیکت نمونه · فایل پیوست",
    time: "زمان نمونه · دیروز",
    read: false,
  },
];

export function StudentDemoSupportNotifications() {
  const [items, setItems] = useState(initialNotifications);
  const unreadCount = items.filter((item) => !item.read).length;

  function markRead(id: string) {
    setItems((current) =>
      current.map((item) => item.id === id ? { ...item, read: true } : item),
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">پیگیری حساب دانش‌آموز</p>
        <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">اعلان‌ها</h2>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          در نسخهٔ فعلی پنل، این بخش اعلان‌های درخواست‌های پشتیبانی را نشان می‌دهد.
        </p>
      </section>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-dena-deep">اعلان‌های پشتیبانی</h3>
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">
            {unreadCount.toLocaleString("fa-IR")} خوانده‌نشده
          </span>
        </div>
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
          اعلان‌های زیر نمونه‌اند و به تیکت یا حساب واقعی متصل نیستند. علامت‌زدن «خواندم» فقط در همین پیش‌نمایش اثر دارد.
        </p>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 ${item.read ? "border-dena-border" : "border-dena-brand/40"}`}
            >
              <div>
                <p className="text-sm font-bold text-dena-ink">{item.label}</p>
                <p className="mt-1 inline-block text-sm text-dena-brand">{item.subject}</p>
                <p className="mt-1 text-xs text-dena-muted">{item.time}</p>
              </div>
              {!item.read ? (
                <button
                  type="button"
                  onClick={() => markRead(item.id)}
                  className="rounded-lg border border-dena-border px-3 py-2 text-xs font-bold text-dena-deep hover:bg-dena-bg"
                >
                  خواندم
                </button>
              ) : (
                <span className="text-xs font-semibold text-dena-muted">خوانده‌شده</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
