import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { AdminShell } from "../../../components/admin/admin-shell";
import { SupportNotifications } from "../../../components/support/support-notifications";
import { getServerAccessContext } from "../../../server/access/actor";
import { listTechnicalSupportInbox, supportStatuses, supportPriorities } from "../../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پشتیبانی فنی | مدیر دنا", robots: { index: false, follow: false } };
const statusLabels: Record<string, string> = {
  new: "جدید", in_progress: "در حال رسیدگی", waiting_requester: "منتظر پاسخ کاربر",
  resolved: "حل‌شده", closed: "بسته",
};
const priorityLabels: Record<string, string> = {
  low: "پایین", normal: "عادی", high: "بالا", urgent: "فوری",
};

export default async function AdminSupportPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string; status?: string; priority?: string; assigned?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const params = await searchParams;
  const { cursor } = params;
  const status = supportStatuses.find((value) => value === params.status);
  const priority = supportPriorities.find((value) => value === params.priority);
  const assignedToMe = params.assigned === "me";
  const result = await listTechnicalSupportInbox(actor.userId, cursor, { status, priority, assignedToMe });
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (priority) query.set("priority", priority);
  if (assignedToMe) query.set("assigned", "me");
  const inboxHref = `/admin/support${query.size ? `?${query}` : ""}`;
  const olderHref = (nextCursor: string) => {
    const next = new URLSearchParams(query);
    next.set("cursor", nextCursor);
    return `/admin/support?${next}`;
  };
  if (!result || result.invalidCursor) notFound();
  const { tickets } = result;

  return (
    <AdminShell active="support" canHandleSupport>
    <main id="main-content" className="min-h-screen bg-dena-bg px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 id="admin-support-title" className="text-2xl font-extrabold text-dena-deep">
              صندوق پشتیبانی فنی
            </h1>
            <p className="mt-2 text-xs leading-6 text-dena-muted">
              در هر صفحه حداکثر ۱۰۰ درخواست؛ متن گفتگو فقط با بازکردن همان تیکت خوانده می‌شود.
            </p>
          </div>
        </header>
        <SupportNotifications />
        <form action="/admin/support" method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-dena-border bg-white p-4">
          <label className="flex-1 text-sm font-bold">وضعیت
            <select name="status" defaultValue={status ?? ""} className="mt-2 min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal">
              <option value="">همهٔ وضعیت‌ها</option>
              {supportStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
            </select>
          </label>
          <label className="flex-1 text-sm font-bold">اولویت
            <select name="priority" defaultValue={priority ?? ""} className="mt-2 min-h-11 w-full rounded-lg border border-dena-border px-3 font-normal">
              <option value="">همهٔ اولویت‌ها</option>
              {supportPriorities.map((value) => <option key={value} value={value}>{priorityLabels[value]}</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="assigned" value="me" defaultChecked={assignedToMe} />فقط تیکت‌های من
          </label>
          <button type="submit" className="min-h-11 rounded-lg bg-dena-brand px-4 text-sm font-bold text-white">اعمال فیلتر</button>
          {(status || priority || assignedToMe) && <Link href="/admin/support" className="px-3 py-3 text-sm font-bold text-dena-brand">حذف فیلترها</Link>}
        </form>
        {tickets.length === 0 ? (
          <Card><p className="text-sm leading-7 text-dena-muted">{status || priority || assignedToMe ? "تیکتی با فیلترهای انتخاب‌شده پیدا نشد." : cursor ? "تیکت قدیمی‌تری وجود ندارد." : "درخواستی برای رسیدگی وجود ندارد."}</p></Card>
        ) : tickets.map((ticket) => (
          <Card key={ticket.id}>
            <Link href={`/support/${ticket.id}`} className="font-bold text-dena-brand underline-offset-4 hover:underline">
              {ticket.subject}
            </Link>
            <p className="mt-2 text-sm font-semibold text-dena-deep">
              {statusLabels[ticket.status] ?? "نامشخص"} · اولویت {priorityLabels[ticket.priority] ?? "نامشخص"}
              {ticket.assignedToUserId ? " · اپراتور تخصیص‌یافته" : " · بدون اپراتور"}
            </p>
            <p className="mt-1 text-xs text-dena-muted">
              به‌روزرسانی: {ticket.updatedAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })} · مهلت پاسخ: {ticket.firstResponseDueAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })} · {ticket.status === "waiting_requester" ? "SLA حل متوقف است" : <>مهلت حل: {ticket.resolutionDueAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</>}
            </p>
          </Card>
        ))}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی درخواست‌های پشتیبانی">
          {cursor && (
            <Link href={inboxHref} className="rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep hover:bg-white">
              تازه‌ترین درخواست‌ها
            </Link>
          )}
          {result.nextCursor && (
            <Link href={olderHref(result.nextCursor)}
              className="rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep hover:bg-white">
              درخواست‌های قدیمی‌تر
            </Link>
          )}
        </nav>
      </div>
    </main>
    </AdminShell>
  );
}
