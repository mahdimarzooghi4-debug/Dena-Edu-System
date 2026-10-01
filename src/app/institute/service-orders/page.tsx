import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteServiceOrders } from "../../../server/institute/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "درخواست‌های خدمات | دنا", robots: { index: false, follow: false } };

const statusLabel = {
  awaiting_guardian_consent: "در انتظار رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
} as const;
const statusClass = {
  awaiting_guardian_consent: "bg-amber-100 text-amber-900",
  awaiting_payment: "bg-sky-100 text-sky-900",
  paid: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-slate-100 text-slate-700",
} as const;

export default async function InstituteServiceOrdersPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();
  const result = await getInstituteServiceOrders(actor.userId);
  if (!result.institutes.length) notFound();

  return <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
    <header>
      <p className="text-sm font-bold text-dena-brand">خدمات جانبی و تخصصی</p>
      <h1 className="mt-1 text-2xl font-extrabold text-dena-deep">درخواست‌های خدمات</h1>
      <p className="mt-2 text-sm leading-7 text-dena-muted">درخواست‌های ثبت‌شده برای خدمات این مؤسسه را همراه با وضعیت رضایت و پرداخت ببینید.</p>
    </header>
    <Card className="border-amber-300 bg-amber-50 text-sm leading-7 text-amber-950">
      تا زمان تکمیل تأیید سرپرست و اتصال پرداخت، این فهرست فقط برای پیگیری است؛ درخواست‌های در انتظار را خدمت قطعی یا وجه دریافتی در نظر نگیرید.
    </Card>
    {result.orders.length === 0 ? <Card className="space-y-2">
      <h2 className="font-extrabold text-dena-deep">هنوز درخواستی ثبت نشده است</h2>
      <p className="text-sm leading-7 text-dena-muted">پس از ثبت درخواست از سوی دانش‌آموز، وضعیت آن در این صفحه نمایش داده می‌شود.</p>
    </Card> : <>
      <p className="text-xs text-dena-muted">آخرین {result.orders.length.toLocaleString("fa-IR")} درخواست</p>
      <ul className="grid gap-4 md:grid-cols-2">
        {result.orders.map((order) => <li key={order.id}><Card className="h-full space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold text-dena-brand">کد درخواست {order.id.slice(0, 8)}</p>
              <h2 className="mt-2 text-lg font-extrabold text-dena-deep">{order.title}</h2></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass[order.status]}`}>{statusLabel[order.status]}</span>
          </div>
          <dl className="grid gap-3 rounded-xl bg-dena-bg p-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-dena-muted">قیمت زمان ثبت درخواست</dt><dd className="font-bold text-dena-deep">{order.priceToman.toLocaleString("fa-IR")} تومان</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-dena-muted">رضایت سرپرست</dt><dd className="font-bold text-dena-deep">{order.guardianConsentRequired ? "لازم است" : "در تعریف خدمت الزامی نیست"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-dena-muted">زمان استفاده</dt><dd className="text-left font-bold text-dena-deep">{order.includedMinutes === null ? "بدون سهمیهٔ زمانی" : `${order.includedMinutes.toLocaleString("fa-IR")} دقیقه · ${order.validityDays?.toLocaleString("fa-IR")} روز اعتبار`}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-dena-muted">تاریخ ثبت</dt><dd className="font-bold text-dena-deep">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(order.createdAt)}</dd></div>
          </dl>
        </Card></li>)}
      </ul>
    </>}
  </main>;
}
