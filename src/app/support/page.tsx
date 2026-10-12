import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { TicketCreateForm } from "../../components/support/ticket-create-form";
import { SupportNotifications } from "../../components/support/support-notifications";
import { getServerAccessContext } from "../../server/access/actor";
import { listRequesterTechnicalSupportTickets } from "../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پشتیبانی فنی | دنا", robots: { index: false, follow: false } };
const statusLabels: Record<string, string> = {
  new: "جدید", in_progress: "در حال رسیدگی", waiting_requester: "منتظر پاسخ شما",
  resolved: "حل‌شده", closed: "بسته",
};

export default async function SupportPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { cursor } = await searchParams;
  const result = await listRequesterTechnicalSupportTickets(actor.userId, cursor);
  if (!result) notFound();
  if (result.invalidCursor) redirect("/support");
  const { tickets } = result;

  return (
    <main id="main-content" className="min-h-screen bg-dena-bg px-5 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-dena-deep">پشتیبانی فنی دنا</h1>
            <p className="mt-2 text-sm leading-7 text-dena-muted">درخواست‌های فنی این حساب در یک گفت‌وگوی خصوصی پیگیری می‌شوند.</p>
          </div>
          <Link href="/account" className={buttonClassName("secondary")}>
            بازگشت به حساب من
          </Link>
        </header>
        <Card>
          <h2 className="mb-5 text-lg font-bold">درخواست تازه</h2>
          <TicketCreateForm />
        </Card>
        <SupportNotifications />
        <section aria-labelledby="support-ticket-list" className="space-y-4">
          <h2 id="support-ticket-list" className="text-lg font-bold">درخواست‌های من</h2>
          {tickets.length === 0 ? (
            <Card><p className="text-sm leading-7 text-dena-muted">هنوز درخواستی ثبت نشده است.</p></Card>
          ) : tickets.map((ticket) => (
            <Card key={ticket.id}>
              <Link href={`/support/${ticket.id}`} className="font-bold text-dena-brand underline-offset-4 hover:underline">
                {ticket.subject}
              </Link>
              <p className="mt-2 text-xs text-dena-muted">
                {statusLabels[ticket.status] ?? "نامشخص"} · آخرین به‌روزرسانی: {ticket.updatedAt.toLocaleString("fa-IR")}
              </p>
              <p className="mt-1 text-xs text-dena-muted">
                مهلت پاسخ: {ticket.firstRespondedAt ? "پاسخ داده شده" : ticket.firstResponseDueAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
                {ticket.status === "waiting_requester" ? " · زمان SLA حل تا پاسخ شما متوقف است" : ticket.status !== "resolved" && ticket.status !== "closed" ? <> · مهلت حل: {ticket.resolutionDueAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</> : null}
              </p>
            </Card>
          ))}
          <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی درخواست‌های من">
            {cursor && (
              <Link href="/support" className="rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep hover:bg-white">
                تازه‌ترین درخواست‌ها
              </Link>
            )}
            {result.nextCursor && (
              <Link href={`/support?cursor=${encodeURIComponent(result.nextCursor)}`}
                className="rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep hover:bg-white">
                درخواست‌های قدیمی‌تر
              </Link>
            )}
          </nav>
        </section>
      </div>
    </main>
  );
}
