import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { listRequesterTechnicalSupportTickets } from "../../../server/support/tickets";
import { Card } from "../../../components/ui/card";
import { TicketCreateForm } from "../../../components/support/ticket-create-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پشتیبانی آنلاین | دنا",
  robots: { index: false, follow: false },
};

type Filter = "all" | "closed" | "responded" | "waiting";
const filterOptions: Array<[Filter, string]> = [
  ["all", "همه"], ["waiting", "در انتظار پاسخ"], ["responded", "پاسخ داده‌شده"], ["closed", "بسته‌شده"],
];
const statusLabels: Record<string, string> = {
  new: "در انتظار پاسخ",
  in_progress: "در انتظار پاسخ",
  waiting_requester: "پاسخ داده‌شده",
  resolved: "بسته‌شده",
  closed: "بسته‌شده",
};
const statusClasses: Record<string, string> = {
  new: "bg-[#fee2e2] text-[#ef4444]",
  in_progress: "bg-[#fee2e2] text-[#ef4444]",
  waiting_requester: "bg-[#e8fff3] text-[#10b981]",
  resolved: "bg-[#f3f4f6] text-[#4b5563]",
  closed: "bg-[#f3f4f6] text-[#4b5563]",
};
const formatDate = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "short", timeZone: "Asia/Tehran",
}).format(value);
function relativeTime(value: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60_000));
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  return `${Math.floor(hours / 24).toLocaleString("fa-IR")} روز پیش`;
}

export default async function InstituteSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; new?: string; status?: string; search?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();

  const params = await searchParams;
  const result = await listRequesterTechnicalSupportTickets(actor.userId, params.cursor);
  if (!result) notFound();
  if (result.invalidCursor) redirect("/institute/support");
  if (params.new === "1") {
    return (
      <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
        <header className="flex min-h-[72px] items-center justify-between border-b border-[#e5e1ed] bg-white px-5 md:px-8">
          <span className="rounded-md bg-[#f8f7fc] px-3 py-2 text-xs text-[#6d6880]">پنل آموزشگاه</span>
          <h1 className="text-lg font-bold text-[#1e1a33]">پشتیبانی آنلاین</h1>
        </header>
        <div className="p-5 md:p-8">
          <div className="mx-auto max-w-3xl space-y-5">
            <Link href="/institute/support" className="text-sm font-semibold text-[#5b4ce2] hover:underline">بازگشت به پشتیبانی</Link>
            <Card className="space-y-5 rounded-xl border-[#e5e1ed] p-5 md:p-7">
              <header className="space-y-2 text-right">
                <h2 className="text-xl font-bold text-[#1e1a33]">ثبت درخواست جدید پشتیبانی</h2>
                <p className="text-sm leading-7 text-[#6d6880]">موضوع و شرح مشکل را بنویسید تا تیم دنا بتواند پیگیری کند.</p>
              </header>
              <TicketCreateForm returnTo="/institute/support" />
            </Card>
          </div>
        </div>
      </main>
    );
  }

  const filter = filterOptions.some(([key]) => key === params.status) ? params.status as Filter : "all";
  const search = params.search?.trim().slice(0, 80) ?? "";
  const matching = result.tickets.filter((ticket) => {
    const matchesSearch = !search || ticket.subject.toLocaleLowerCase("fa-IR").includes(search.toLocaleLowerCase("fa-IR"));
    const group: Filter = ticket.status === "closed" || ticket.status === "resolved"
      ? "closed" : ticket.status === "waiting_requester" ? "responded" : "waiting";
    return matchesSearch && (filter === "all" || filter === group);
  });
  const today = new Intl.DateTimeFormat("fa-IR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran",
  }).format(new Date());

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <form action="/institute/support" method="get" role="search"
            className="flex min-h-10 w-full max-w-[240px] items-center gap-2 rounded-lg bg-[#f8f7fc] px-3">
            {filter !== "all" && <input type="hidden" name="status" value={filter} />}
            <input name="search" type="search" defaultValue={search} placeholder="جستجو در پنل..."
              aria-label="جست‌وجو در درخواست‌های پشتیبانی"
              className="min-w-0 flex-1 bg-transparent text-right text-[13px] text-[#6d6880] outline-none placeholder:text-[#6d6880]" />
            <span aria-hidden="true" className="text-[#6d6880]">⌕</span>
          </form>
          <p className="hidden text-[13px] text-[#6d6880] sm:block">امروز: {today}</p>
        </div>
        <h1 className="text-xl font-bold text-[#1e1a33]">پشتیبانی آنلاین</h1>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/institute/support?new=1"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-[#5b4ce2] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#4b3dc9]">
            <span>ایجاد درخواست جدید</span><span aria-hidden="true" className="text-base">＋</span>
          </Link>
          <nav aria-label="فیلتر درخواست‌ها" className="flex flex-wrap gap-2">
            {filterOptions.map(([key, label]) => {
              const href = "/institute/support" + (key === "all" ? "" : "?status=" + key);
              return <Link key={key} href={href} aria-current={filter === key ? "page" : undefined}
                className={"rounded-lg border px-4 py-2 text-[13px] " +
                  (filter === key ? "border-[#5b4ce2] bg-[#5b4ce2] font-semibold text-white" : "border-[#e5e1ed] bg-white text-[#6d6880] hover:border-[#5b4ce2]")}>
                {label}
              </Link>;
            })}
          </nav>
        </div>

        {matching.length === 0 ? (
          <Card className="flex min-h-48 flex-col items-center justify-center rounded-xl border-[#e5e1ed] p-6 text-center">
            <h2 className="text-base font-bold text-[#1e1a33]">{search || filter !== "all" ? "درخواستی با این فیلتر پیدا نشد." : "هنوز درخواستی ثبت نشده است."}</h2>
            <p className="mt-2 text-sm leading-7 text-[#6d6880]">برای پیگیری یک مسئله، درخواست جدیدی برای پشتیبانی ثبت کنید.</p>
            <Link href="/institute/support?new=1" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#5b4ce2] px-4 text-sm font-semibold text-white">ثبت درخواست جدید</Link>
          </Card>
        ) : (
          <section aria-label="فهرست درخواست‌های پشتیبانی" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
            <div className="hidden items-center border-b border-[#e5e1ed] bg-[#f8f7fc] px-6 py-4 text-[13px] font-bold text-[#6d6880] lg:flex">
              <span className="w-[120px]">آخرین بروزرسانی</span><span className="w-[120px]">تاریخ ایجاد</span><span className="w-[120px]">وضعیت</span><span className="w-[100px]">دسته‌بندی</span><span className="min-w-0 flex-1">موضوع درخواست</span><span className="w-[100px]">شماره درخواست</span>
            </div>
            <div className="divide-y divide-[#e5e1ed]">
              {matching.map((ticket) => (
                <Link key={ticket.id} href={"/support/" + encodeURIComponent(ticket.id)}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#fbfaff] lg:flex-row lg:items-center lg:gap-0 lg:px-6">
                  <span className="text-[13px] text-[#6d6880] lg:w-[120px]">{relativeTime(ticket.updatedAt)}</span>
                  <span className="text-[13px] text-[#6d6880] lg:w-[120px]">{formatDate(ticket.createdAt)}</span>
                  <span className="lg:w-[120px]"><span className={"inline-flex rounded-md px-2.5 py-1 text-xs font-semibold " + (statusClasses[ticket.status] ?? "bg-[#f3f4f6] text-[#4b5563]")}>{statusLabels[ticket.status] ?? "نامشخص"}</span></span>
                  <span className="text-[13px] text-[#1e1a33] lg:w-[100px]">فنی</span>
                  <span className="min-w-0 flex-1 font-semibold text-[#5b4ce2] underline decoration-transparent underline-offset-4 hover:decoration-current">{ticket.subject}</span>
                  <span className="text-xs font-bold text-[#6d6880] lg:w-[100px]">#{ticket.id.slice(0, 4).toLocaleUpperCase("fa-IR")}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <nav aria-label="صفحه‌بندی درخواست‌ها" className="flex justify-between gap-3">
          {params.cursor && <Link href="/institute/support" className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-2 text-sm font-semibold text-[#1e1a33]">درخواست‌های تازه‌تر</Link>}
          {result.nextCursor && <Link href={"/institute/support?cursor=" + encodeURIComponent(result.nextCursor) + (filter === "all" ? "" : "&status=" + filter) + (search ? "&search=" + encodeURIComponent(search) : "")} className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-2 text-sm font-semibold text-[#1e1a33]">درخواست‌های قدیمی‌تر</Link>}
        </nav>
      </div>
    </main>
  );
}
