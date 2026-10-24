import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../server/access/actor";
import { getOrganizationPanelSnapshot } from "../../server/organization/analytics";
import { getOrganizationScopes } from "../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "داشبورد سازمان | دنا",
  robots: { index: false, follow: false },
};

const fa = (value: number) => value.toLocaleString("fa-IR");

const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short", timeZone: "Asia/Tehran",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
};

const navigation = [
  { href: "/organization", label: "داشبورد" },
  { href: "/organization/students", label: "دانش‌آموزان" },
  { href: "/organization/growth", label: "رشد و پیشرفت" },
  { href: "/organization/reports", label: "گزارش‌ها" },
  { href: "/organization/notifications", label: "پیگیری‌ها" },
] as const;

export default async function OrganizationHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "organization")) notFound();
  const organizations = await getOrganizationScopes(actor.userId);
  if (!organizations.length) notFound();

  // This snapshot contains aggregate counts only; student identities and
  // learning outcomes are intentionally not part of the organization dashboard.
  const snapshot = await getOrganizationPanelSnapshot(organizations);
  const metrics = [
    {
      label: "پرونده‌های دانش‌آموزی ثبت‌شده",
      value: snapshot.totals.students,
      symbol: "▤",
      tone: "bg-[#eeeaff] text-[#5b4ce2]",
    },
    {
      label: "شماره‌های تماس تأییدشده",
      value: snapshot.totals.phoneVerified,
      symbol: "✓",
      tone: "bg-[#e8f5ef] text-[#24845a]",
    },
    {
      label: "سازمان‌های قابل مشاهده",
      value: organizations.length,
      symbol: "◫",
      tone: "bg-[#fff3df] text-[#b7791f]",
    },
    {
      label: "در انتظار تأیید شماره",
      value: snapshot.totals.activationPending,
      symbol: "!",
      tone: "bg-[#fff0f0] text-[#c04c4c]",
      alert: true,
    },
  ];
  const chartMonths = snapshot.months;
  const maxRegistrations = Math.max(1, ...chartMonths.map((item) => item.registrations));
  const chartPoints = chartMonths.map((item, index) => {
    const x = chartMonths.length < 2 ? 249 : 20 + index * (458 / (chartMonths.length - 1));
    const y = 116 - (item.registrations / maxRegistrations) * 94;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc] lg:flex">
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col justify-between bg-[#1e1145] p-6 text-white lg:sticky lg:top-0 lg:flex">
        <div>
          <Link href="/organization" aria-label="خانهٔ پنل سازمان"
            className="flex items-center justify-end gap-3">
            <span className="text-right">
              <span className="block text-base font-extrabold">سامانه دنا</span>
              <span className="mt-0.5 block text-[11px] text-[#b08cff]">پنل سازمان</span>
            </span>
            <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-[#5b4ce2] text-lg font-black">د</span>
          </Link>
          <nav aria-label="منوی سازمان" className="mt-8">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const active = item.href === "/organization";
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-lg px-4 text-sm transition-colors ${active
                        ? "bg-[#382973] font-bold text-[#b08cff]"
                        : "text-[#e5e1ed] hover:bg-[#382973] hover:text-white"}`}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="space-y-1 border-t border-white/15 pt-4">
          <Link href="/support" className="flex min-h-11 items-center rounded-lg px-4 text-sm text-[#e5e1ed] hover:bg-[#382973]">پشتیبانی آنلاین</Link>
          <Link href="/account" className="flex min-h-11 items-center rounded-lg px-4 text-sm text-[#e5e1ed] hover:bg-[#382973]">حساب من</Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-[84px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
          <div>
            <p className="text-[11px] text-[#7e7a94]">داشبورد</p>
            <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">داشبورد سازمان</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/organization/notifications" aria-label="پیگیری‌های سازمان"
              className="grid size-10 place-items-center rounded-full bg-[#f8f7fc] text-[#5b4ce2] hover:bg-[#eeeaff]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </Link>
            <Link href="/organization/students"
              className="hidden rounded-lg bg-[#5b4ce2] px-4 py-2 text-sm font-bold text-white hover:bg-[#493cc2] sm:inline-flex">
              مدیریت دانش‌آموزان
            </Link>
            <Link href="/account" className="rounded-lg border border-[#e5e1ed] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#f8f7fc] sm:hidden">حساب من</Link>
          </div>
        </header>

        <nav aria-label="دسترسی سریع سازمان" className="flex gap-2 overflow-x-auto border-b border-[#e5e1ed] bg-white px-5 py-3 lg:hidden">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}
              aria-current={item.href === "/organization" ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${item.href === "/organization" ? "bg-[#eeeaff] text-[#5b4ce2]" : "text-[#7e7a94] hover:bg-[#f8f7fc]"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="space-y-6 p-5 md:p-8">
          <section aria-label="آمار سازمان" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.label} className="flex min-h-[98px] items-center gap-4 rounded-xl border border-[#e5e1ed] bg-white p-5">
                <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-lg text-lg font-black ${metric.tone}`}>
                  {metric.symbol}
                </span>
                <div className="min-w-0">
                  <h2 className="text-[13px] leading-6 text-[#7e7a94]">{metric.label}</h2>
                  <p className={`text-[22px] font-extrabold ${metric.alert ? "text-[#f26666]" : "text-[#1e1a33]"}`}>
                    {fa(metric.value)}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h2 className="mb-4 text-base font-extrabold text-[#1e1a33]">روند ثبت پرونده‌های دانش‌آموزی</h2>
              <p className="mb-3 text-xs text-[#7e7a94]">شش ماه اخیر · فقط سازمان‌های مجاز این حساب</p>
              <svg viewBox="0 0 498 132" className="h-40 w-full overflow-visible" role="img"
                aria-label={`روند ثبت پرونده در شش ماه اخیر: ${chartMonths.map((item) => `${monthLabel(item.month)} ${fa(item.registrations)}`).join("، ")}`}>
                {[22, 69, 116].map((y) => <line key={y} x1="0" x2="498" y1={y} y2={y} stroke="#e5e1ed" strokeWidth="1" />)}
                {chartMonths.length > 1 && <polyline points={chartPoints} fill="none" stroke="#5b4ce2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                {chartMonths.map((item, index) => {
                  const x = chartMonths.length < 2 ? 249 : 20 + index * (458 / (chartMonths.length - 1));
                  const y = 116 - (item.registrations / maxRegistrations) * 94;
                  return <circle key={item.month} cx={x} cy={y} r="4" fill="#5b4ce2" stroke="white" strokeWidth="2">
                    <title>{monthLabel(item.month)}: {fa(item.registrations)} پرونده</title>
                  </circle>;
                })}
              </svg>
              <div className="mt-2 flex justify-between px-2 text-[11px] text-[#7e7a94]" aria-hidden="true">
                {chartMonths.map((item) => <span key={item.month}>{monthLabel(item.month)}</span>)}
              </div>
              <p className="mt-4 text-xs leading-6 text-[#7e7a94]">این نمودار تعداد پرونده‌های ثبت‌شده را نشان می‌دهد؛ شاخص رشد یا نتیجهٔ تحصیلی نیست.</p>
            </article>

            <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h2 className="mb-4 text-base font-extrabold text-[#1e1a33]">وضعیت پرونده‌ها در سازمان‌های مجاز</h2>
              {snapshot.organizations.length === 0 ? (
                <p className="rounded-lg bg-[#f8f7fc] p-4 text-sm text-[#7e7a94]">سازمان قابل نمایشی وجود ندارد.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.organizations.map((organization) => (
                    <li key={organization.id}>
                      <Link href={`/organization/students?organizationId=${encodeURIComponent(organization.id)}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-3 hover:bg-[#eeeaff]">
                        <span className="min-w-0 flex-1 text-sm font-bold text-[#1e1a33]">{organization.name}</span>
                        <span className="text-xs text-[#7e7a94]">{fa(organization.students)} پرونده</span>
                        <span className={`rounded px-2 py-1 text-[11px] font-bold ${organization.activationPending > 0 ? "bg-[#fef3c7] text-[#b7791f]" : "bg-[#e8f5ef] text-[#24845a]"}`}>
                          {organization.activationPending > 0
                            ? `${fa(organization.activationPending)} نیازمند تأیید`
                            : "شماره‌ها تأیید شده"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs leading-6 text-[#7e7a94]">نمایش پرونده‌های فردی فقط در فهرست دانش‌آموزان و در محدودهٔ مجاز انجام می‌شود.</p>
            </article>
          </section>

          <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold text-[#1e1a33]">دسترسی سریع عملیاتی</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/organization/students" className="rounded-lg border border-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-[#5b4ce2] hover:bg-[#eeeaff]">مدیریت پرونده‌ها</Link>
              <Link href="/organization/reports" className="rounded-lg border border-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-[#5b4ce2] hover:bg-[#eeeaff]">گزارش ثبت‌نام</Link>
              <Link href="/organization/notifications" className="rounded-lg bg-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#493cc2]">پیگیری موارد در انتظار</Link>
            </div>
          </section>

          <aside className="rounded-xl border border-[#e5e1ed] bg-white px-5 py-4 text-xs leading-6 text-[#7e7a94]">
            آمار از پرونده‌های ثبت‌شده در محدوده‌های سازمانی مجاز این حساب محاسبه شده است. این داشبورد اطلاعات هویتی دانش‌آموزان یا نتیجهٔ یادگیری را نمایش نمی‌دهد.
          </aside>
        </main>
      </div>
    </div>
  );
}
