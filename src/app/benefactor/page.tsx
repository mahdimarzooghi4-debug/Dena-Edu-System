import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../server/access/actor";
import { getBenefactorScopes } from "../../server/benefactor/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "داشبورد خیر | دنا",
  robots: { index: false, follow: false },
};

const shortDate = (date: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeZone: "Asia/Tehran",
}).format(date);

export default async function BenefactorHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "benefactor")) notFound();
  const benefactors = await getBenefactorScopes(actor.userId);
  if (!benefactors.length) notFound();

  const metrics = [
    {
      label: "هویت‌های حمایتی مجاز",
      value: benefactors.length.toLocaleString("fa-IR"),
      note: "مرتبط با عضویت فعال این حساب",
      symbol: "◉",
      tone: "bg-[#eeeaff] text-[#5b4ce2]",
    },
    {
      label: "دانش‌آموزان تحت حمایت",
      value: "—",
      note: "هویت گیرندگان در دسترس پنل خیر نیست",
      symbol: "♙",
      tone: "bg-[#e8f5ef] text-[#24845a]",
    },
    {
      label: "پرداخت و تخصیص کمک",
      value: "—",
      note: "عملیات مالی هنوز متصل نشده است",
      symbol: "↗",
      tone: "bg-[#fff3df] text-[#b7791f]",
    },
    {
      label: "اعلان‌های عملیاتی",
      value: "—",
      note: "گردش‌کار اعلان هنوز فعال نیست",
      symbol: "!",
      tone: "bg-[#fff0f0] text-[#c04c4c]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7fc]">


      <div className="min-w-0 flex-1">
        <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
          <div>
            <p className="text-[11px] text-[#7e7a94]">داشبورد خیر</p>
            <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">داشبورد خیر</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/benefactor/notifications" aria-label="اعلان‌های خیر"
              className="grid size-10 place-items-center rounded-full bg-[#f8f7fc] text-[#5b4ce2] hover:bg-[#eeeaff]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </Link>
            <Link href="/benefactor/reports" className="hidden rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff] sm:inline-flex">
              وضعیت گزارش‌ها
            </Link>
            <Link href="/account" className="rounded-lg border border-[#e5e1ed] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#f8f7fc] sm:hidden">حساب من</Link>
          </div>
        </header>



        <main id="main-content" className="space-y-6 p-5 md:p-8">
          <section aria-label="وضعیت پنل خیر" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.label} className="flex min-h-[98px] items-center gap-4 rounded-xl border border-[#e5e1ed] bg-white p-5">
                <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-lg text-lg font-black ${metric.tone}`}>
                  {metric.symbol}
                </span>
                <div className="min-w-0">
                  <h2 className="text-[13px] leading-6 text-[#7e7a94]">{metric.label}</h2>
                  <p className={`text-[22px] font-extrabold ${metric.value === "—" ? "text-[#7e7a94]" : "text-[#1e1a33]"}`}>
                    {metric.value}
                  </p>
                  <p className="text-[10px] leading-5 text-[#7e7a94]">{metric.note}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h2 className="text-base font-extrabold text-[#1e1a33]">گزارش رشد و پیشرفت تحصیلی</h2>
              <div className="mt-4 grid min-h-[160px] place-items-center rounded-lg bg-[#f8f7fc] px-5 py-6 text-center">
                <div>
                  <span aria-hidden="true" className="mx-auto grid size-11 place-items-center rounded-full bg-white text-xl font-bold text-[#7e7a94]">—</span>
                  <p className="mt-3 text-sm font-bold text-[#1e1a33]">گزارش آموزشی در پنل خیر ارائه نمی‌شود</p>
                  <p className="mt-1 max-w-md text-xs leading-6 text-[#7e7a94]">
                    نمره، روند یادگیری و شناسهٔ پروندهٔ دانش‌آموزان خصوصی است و در این نقش در دسترس نیست.
                  </p>
                </div>
              </div>
              <Link href="/benefactor/growth" className="mt-4 inline-flex text-sm font-bold text-[#5b4ce2] hover:underline">
                جزئیات محدودهٔ گزارش رشد
              </Link>
            </article>

            <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-md bg-[#eeeaff] px-2 py-1 text-xs font-bold text-[#5b4ce2]">
                  {benefactors.length.toLocaleString("fa-IR")} هویت
                </span>
                <h2 className="text-base font-extrabold text-[#1e1a33]">هویت‌های حمایتی دارای دسترسی</h2>
              </div>
              <ul className="space-y-2">
                {benefactors.map((benefactor) => (
                  <li key={benefactor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-3">
                    <span className="text-sm font-bold text-[#1e1a33]">{benefactor.name}</span>
                    <span className="text-xs text-[#7e7a94]">
                      بررسی هویت: <time dateTime={benefactor.verifiedAt.toISOString()}>{shortDate(benefactor.verifiedAt)}</time>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-6 text-[#7e7a94]">
                این فهرست هویت‌های حمایتیِ متصل به حساب شماست؛ اطلاعات دانش‌آموزان یا گیرندگان حمایت در آن وجود ندارد.
              </p>
            </article>
          </section>

          <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold text-[#1e1a33]">وضعیت عملیات سامانه</h2>
            <ul className="divide-y divide-[#e5e1ed]">
              <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-sm text-[#1e1a33]">پرداخت و تخصیص کمک</span>
                <span className="rounded-md bg-[#fff3df] px-2 py-1 text-xs font-bold text-[#b7791f]">به بک‌اند عملیاتی متصل نیست</span>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm text-[#1e1a33]">رسید و گزارش مصرف صندوق</span>
                <span className="rounded-md bg-[#fff3df] px-2 py-1 text-xs font-bold text-[#b7791f]">رویداد واقعی ثبت نمی‌شود</span>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0">
                <span className="text-sm text-[#1e1a33]">اعلان‌های حمایتی</span>
                <span className="rounded-md bg-[#fff3df] px-2 py-1 text-xs font-bold text-[#b7791f]">گردش‌کار هنوز فعال نیست</span>
              </li>
            </ul>
          </section>

          <section className="flex flex-wrap gap-3">
            <Link href="/benefactor/reports" className="rounded-lg border border-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-[#5b4ce2] hover:bg-[#eeeaff]">گزارش‌های صندوق</Link>
            <Link href="/benefactor/students" className="rounded-lg border border-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-[#5b4ce2] hover:bg-[#eeeaff]">حریم خصوصی دانش‌آموزان</Link>
            <Link href="/account" className="rounded-lg bg-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#493cc2]">حساب من</Link>
          </section>

          <aside className="rounded-xl border border-[#e5e1ed] bg-white px-5 py-4 text-xs leading-6 text-[#7e7a94]">
            وضعیت هویت خیر فقط دسترسی حساب شما را مشخص می‌کند؛ به معنی پرداخت، تخصیص کمک یا صدور رسید نیست.
          </aside>
        </main>
      </div>
    </div>
  );
}
