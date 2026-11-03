import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { TicketCreateForm } from "../../components/support/ticket-create-form";
import { StudentShell } from "../../components/student/student-shell";
import { getServerAccessContext } from "../../server/access/actor";
import { listRequesterTechnicalSupportTickets } from "../../server/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پشتیبانی فنی | دنا", robots: { index: false, follow: false } };
function relativeTime(value: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60_000));
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  return `${Math.floor(hours / 24).toLocaleString("fa-IR")} روز پیش`;
}

const statusLabels: Record<string, string> = {
  new: "جدید", in_progress: "در حال رسیدگی", waiting_requester: "منتظر پاسخ شما",
  resolved: "حل‌شده", closed: "بسته",
};

export default async function SupportPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string; new?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { cursor, new: createNew } = await searchParams;
  const result = await listRequesterTechnicalSupportTickets(actor.userId, cursor);
  if (!result) notFound();
  if (result.invalidCursor) redirect("/support");
  const { tickets } = result;

  if (createNew === "1") {
    return (
      <StudentShell active="support" title="پشتیبانی آنلاین">
        <div className="mx-auto max-w-3xl space-y-5">
          <Link href="/support" className="text-sm font-semibold text-dena-brand hover:underline">
            بازگشت به پشتیبانی
          </Link>
          <Card className="space-y-5 rounded-[22px] p-5 md:p-7">
            <header className="space-y-2 text-right">
              <h2 className="text-xl font-extrabold text-dena-deep">ثبت درخواست جدید پشتیبانی</h2>
              <p className="text-sm leading-7 text-dena-muted">
                موضوع و شرح مشکل را بنویس تا تیم دنا بتواند پیگیری کند.
              </p>
            </header>
            <TicketCreateForm />
          </Card>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell active="support" title="پشتیبانی آنلاین">
      <div className="space-y-5">
        <Card className="rounded-[22px] p-5 md:p-7">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl text-right">
              <h2 className="text-xl font-extrabold text-dena-deep">پشتیبانی آنلاین دنا</h2>
              <p className="mt-2 text-sm leading-7 text-dena-muted">
                برای مسائل فنی و استفاده از دنا می‌توانی از این بخش با پشتیبانی در ارتباط باشی.
              </p>
            </div>
            <Link href="/support?new=1" className={buttonClassName()}>
              درخواست جدید
            </Link>
          </div>
        </Card>

        <section aria-labelledby="support-ticket-list" className="space-y-4">
          <h2 id="support-ticket-list" className="text-lg font-extrabold text-dena-deep">درخواست‌های من</h2>
          {tickets.length === 0 ? (
            <Card className="flex min-h-48 flex-col items-center justify-center rounded-[22px] p-6 text-center">
              <h3 className="text-base font-extrabold text-dena-deep">هنوز درخواستی ثبت نکرده‌ای</h3>
              <p className="mt-2 text-sm leading-7 text-dena-muted">اگر در استفاده از دنا به کمکی نیاز داری، درخواستت را برای پشتیبانی بفرست.</p>
              <Link href="/support?new=1" className={`${buttonClassName()} mt-4`}>ثبت درخواست جدید</Link>
            </Card>
          ) : tickets.map((ticket) => (
            <Card key={ticket.id} className="rounded-[20px] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/support/${ticket.id}`} className="font-bold text-dena-ink underline-offset-4 hover:text-dena-brand hover:underline">
                  {ticket.subject}
                </Link>
                <span className="rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">
                  {statusLabels[ticket.status] ?? "نامشخص"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-dena-muted">
                {relativeTime(ticket.updatedAt)}
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
    </StudentShell>
  );
}
