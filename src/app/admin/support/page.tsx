import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { AdminShell } from "../../../components/admin/admin-shell";
import { SupportNotifications } from "../../../components/support/support-notifications";
import { getServerAccessContext } from "../../../server/access/actor";
import { listTechnicalSupportInbox } from "../../../server/support/tickets";

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
}: { searchParams: Promise<{ cursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { cursor } = await searchParams;
  const result = await listTechnicalSupportInbox(actor.userId, cursor);
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
        {tickets.length === 0 ? (
          <Card><p className="text-sm leading-7 text-dena-muted">درخواستی برای رسیدگی وجود ندارد.</p></Card>
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
              به‌روزرسانی: {ticket.updatedAt.toLocaleString("fa-IR")} · مهلت پاسخ: {ticket.firstResponseDueAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })} · {ticket.status === "waiting_requester" ? "SLA حل متوقف است" : <>مهلت حل: {ticket.resolutionDueAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</>}
            </p>
          </Card>
        ))}
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی درخواست‌های پشتیبانی">
          {cursor && (
            <Link href="/admin/support" className="rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep hover:bg-white">
              تازه‌ترین درخواست‌ها
            </Link>
          )}
          {result.nextCursor && (
            <Link href={`/admin/support?cursor=${encodeURIComponent(result.nextCursor)}`}
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
