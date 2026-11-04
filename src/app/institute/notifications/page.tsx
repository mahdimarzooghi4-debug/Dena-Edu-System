import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MarkAllInstituteNotificationsRead } from "../../../components/institute/notification-read-controls";
import { getServerAccessContext } from "../../../server/access/actor";
import { listTechnicalSupportNotifications } from "../../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "اعلان‌ها | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

const labels: Record<string, string> = {
  ticket_created: "درخواست پشتیبانی ثبت شد",
  requester_replied: "پاسخ جدید در درخواست پشتیبانی",
  support_replied: "پاسخ پشتیبانی دریافت شد",
  ticket_updated: "وضعیت درخواست پشتیبانی تغییر کرد",
  attachment_added: "پیوست جدید به درخواست افزوده شد",
  attachment_scanned: "بررسی پیوست درخواست تکمیل شد",
};
const dateTime = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);

type Tab = "all" | "unread" | "system";
export default async function InstituteNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) =>
    membership.role === "institute" && membership.status === "active")) notFound();

  const params = await searchParams;
  const tab: Tab = params.tab === "unread" || params.tab === "system" ? params.tab : "all";
  const all = await listTechnicalSupportNotifications(actor.userId) ?? [];
  const unread = all.filter((item) => !item.readAt);
  const shown = tab === "unread" ? unread : tab === "system" ? [] : all;
  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all", label: "همه", count: all.length },
    { id: "unread", label: "خوانده‌نشده", count: unread.length },
    { id: "system", label: "سیستم", count: 0 },
  ];

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-5 md:px-10">
        <span className="rounded-lg bg-[rgba(91,76,226,0.08)] px-3 py-1.5 text-xs font-bold text-[#5b4ce2]">پنل آموزشگاه</span>
        <h1 className="text-lg font-bold text-[#1e1a3c]">اعلان‌ها</h1>
      </header>
      <div className="space-y-6 p-5 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="فیلتر اعلان‌ها" className="flex items-center gap-1 rounded-xl bg-white p-1">
            {tabs.map((item) => (
              <Link key={item.id} href={item.id === "all" ? "/institute/notifications" : `/institute/notifications?tab=${item.id}`}
                aria-current={tab === item.id ? "page" : undefined}
                className={tab === item.id
                  ? "rounded-lg bg-[#f0eefd] px-4 py-2 text-sm font-bold text-[#5b4ce2]"
                  : "rounded-lg px-4 py-2 text-sm font-semibold text-[#807b9a] hover:bg-[#f8f7fc]"}>
                {item.label} <span className="mr-1 text-xs">{item.count.toLocaleString("fa-IR")}</span>
              </Link>
            ))}
          </nav>
          <MarkAllInstituteNotificationsRead ids={unread.map((item) => item.id)} />
        </div>

        <section aria-label="فهرست اعلان‌ها" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
          {shown.length ? (
            <ul className="divide-y divide-[#e5e1ed]">
              {shown.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!item.readAt && <span aria-label="خوانده‌نشده" className="size-2 rounded-full bg-[#5b4ce2]" />}
                      <h2 className="font-bold text-[#1e1a3c]">{labels[item.kind] ?? "اعلان پشتیبانی"}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#807b9a]">{item.subject}</p>
                    <time dateTime={item.createdAt.toISOString()} className="mt-2 block text-xs text-[#9b96ad]">{dateTime(item.createdAt)}</time>
                  </div>
                  <Link href={`/support/${encodeURIComponent(item.ticketId)}`}
                    className="inline-flex min-h-9 items-center rounded-lg border border-[#5b4ce2] px-3 text-xs font-semibold text-[#5b4ce2] hover:bg-[#f8f7fc]">
                    مشاهدهٔ درخواست
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <h2 className="font-bold text-[#1e1a3c]">
                {tab === "system" ? "اعلان سامانه‌ای ثبت‌شده‌ای در این بخش وجود ندارد."
                  : tab === "unread" ? "اعلان خوانده‌نشده‌ای ندارید."
                    : "هنوز اعلانی برای این حساب ثبت نشده است."}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#807b9a]">
                {tab === "system"
                  ? "در مدل فعلی مخزن، اعلان‌های قابل نمایش برای مؤسسه به درخواست‌های پشتیبانی محدود هستند."
                  : "اعلان‌های مجاز پشتیبانی پس از ثبت یا تغییر درخواست در همین صفحه نمایش داده می‌شوند."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
