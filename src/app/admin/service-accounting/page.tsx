import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import {
  adminServiceOrderStatuses,
  getAdminServiceAccountingOverview,
  type AdminServiceOrderStatus,
} from "../../../server/admin/service-accounting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خدمات و حسابداری | دنا", robots: { index: false, follow: false } };

const statusLabels: Record<AdminServiceOrderStatus, string> = {
  awaiting_guardian_consent: "در انتظار رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
};
const categoryLabels: Record<string, string> = {
  consultation: "مشاوره", career_guidance: "انتخاب رشته و مسیر شغلی",
  assessment: "ارزیابی آموزشی", support: "پشتیبانی آموزشی", other: "سایر خدمات",
};
const formatNumber = (value: number) => value.toLocaleString("fa-IR");
const formatToman = (value: number) => `${formatNumber(value)} تومان`;
const formatDate = (date: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeZone: "Asia/Tehran",
}).format(date);

type SearchParams = Promise<{ status?: string; order?: string }>;

export default async function AdminServiceAccountingPage({ searchParams }: { searchParams: SearchParams }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();
  const canHandleSupport = actor.memberships.some((item) => item.role === "admin" && item.canHandleTechnicalSupport);
  const params = await searchParams;
  const status = adminServiceOrderStatuses.find((item) => item === params.status);
  const overview = await getAdminServiceAccountingOverview(status);
  const selectedOrder = overview.orders.find((order) => order.id === params.order);

  const statusFilters: Array<AdminServiceOrderStatus | undefined> = [undefined, ...adminServiceOrderStatuses];

  return <AdminShell active="service-accounting" canHandleSupport={canHandleSupport}>
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-7 md:px-8 lg:px-10">
      <header className="space-y-3">
        <p className="text-sm font-bold text-dena-brand">پنل مدیریت دنا / خدمات مؤسسه</p>
        <h1 className="text-2xl font-extrabold text-dena-deep md:text-3xl">نظارت، گزارش و حسابداری خدمات مؤسسه</h1>
        <p className="text-sm leading-7 text-dena-muted">وضعیت سفارش‌های خدمات و سهم‌های ثبت‌شده را بر پایهٔ داده‌های واقعی سامانه مرور کنید.</p>
        <span className="inline-flex rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">گزارش فقط‌خواندنی · به‌روزرسانی در هر بار بازکردن</span>
      </header>

      <Card className="border-dena-brand/20 bg-dena-lavender/50 text-sm leading-7 text-dena-deep">
        این صفحه فقط سفارش‌های ثبت‌شده و وضعیت پرداخت ذخیره‌شده را گزارش می‌کند. ثبت دریافت درگاه، کارمزد، تسویه بانکی و بازپرداخت به اتصال و رویدادهای مالی معتبر نیاز دارد؛ بنابراین مبلغ تسویه‌شده نمایش داده نمی‌شود.
      </Card>

      <section aria-label="خلاصهٔ خدمات" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="کل سفارش‌ها" value={formatNumber(overview.orderCount)} note="همهٔ وضعیت‌ها" />
        <Metric label="در انتظار رضایت سرپرست" value={formatNumber(overview.totals.awaiting_guardian_consent)} note="نیازمند ثبت رضایت توسط مؤسسه" />
        <Metric label="در انتظار پرداخت" value={formatNumber(overview.totals.awaiting_payment)} note="پرداختی در سامانه ثبت نشده" />
        <Metric label="پرداخت‌شده" value={formatNumber(overview.totals.paid)} note="سفارش‌هایی با وضعیت پرداخت‌شده" />
      </section>

      <section aria-labelledby="accounting-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="accounting-title" className="text-lg font-extrabold text-dena-deep">جمع مبالغ سفارش‌های پرداخت‌شده</h2>
            <p className="mt-1 text-xs leading-6 text-dena-muted">بر اساس وضعیت سفارش‌ها؛ این ارقام به معنی تسویهٔ بانکی نیستند.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="مبلغ ناخالص" value={formatToman(overview.paidAccounting.grossToman)} note="معادل ریالی قیمت سفارش‌ها" />
          <Metric label="سهم دنا · ۱۰٪" value={formatToman(overview.paidAccounting.denaShareToman)} note="پیش از هرگونه ثبت کارمزد درگاه" />
          <Metric label="سهم مؤسسه" value={formatToman(overview.paidAccounting.instituteShareToman)} note="پیش از کسر کارمزد درگاه" />
        </div>
      </section>

      <section aria-labelledby="orders-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="orders-title" className="text-lg font-extrabold text-dena-deep">صف سفارش‌های خدمات</h2>
            <p className="mt-1 text-sm text-dena-muted">نام و شناسهٔ دانش‌آموز در این گزارش نمایش داده نمی‌شود.</p></div>
          <p className="text-xs text-dena-muted">حداکثر ۱۰۰ سفارش اخیر در هر فیلتر</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="فیلتر وضعیت سفارش">
          {statusFilters.map((filter) => {
            const selected = (status ?? undefined) === filter;
            const href = filter ? `/admin/service-accounting?status=${filter}` : "/admin/service-accounting";
            const label = filter ? statusLabels[filter] : "همه";
            const countValue = filter ? overview.totals[filter] : overview.orderCount;
            return <Link key={filter ?? "all"} href={href} aria-current={selected ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${selected ? "bg-dena-brand text-white" : "bg-white text-dena-muted ring-1 ring-dena-border hover:bg-dena-bg"}`}>
              {label} · {formatNumber(countValue)}
            </Link>;
          })}
        </div>
        <Card className="overflow-hidden p-0">
          {overview.orders.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-right text-sm">
              <thead className="bg-dena-bg text-xs text-dena-muted"><tr>
                <th scope="col" className="px-4 py-3 font-bold">خدمت</th><th scope="col" className="px-4 py-3 font-bold">مؤسسه</th>
                <th scope="col" className="px-4 py-3 font-bold">قیمت</th><th scope="col" className="px-4 py-3 font-bold">سهم دنا</th>
                <th scope="col" className="px-4 py-3 font-bold">وضعیت</th><th scope="col" className="px-4 py-3 font-bold">ثبت</th>
                <th scope="col" className="px-4 py-3 font-bold">جزئیات</th>
              </tr></thead>
              <tbody className="divide-y divide-dena-border">
                {overview.orders.map((order) => <tr key={order.id} className="hover:bg-dena-bg/60">
                  <td className="px-4 py-3"><p className="font-bold text-dena-deep">{order.title}</p><p className="mt-1 text-xs text-dena-muted">{categoryLabels[order.category] ?? "خدمت"}</p></td>
                  <td className="px-4 py-3">{order.instituteName}</td><td className="px-4 py-3 whitespace-nowrap">{formatToman(order.priceToman)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatToman(Math.floor(order.denaShareRials / 10))}</td>
                  <td className="px-4 py-3"><span className="inline-flex rounded-full bg-dena-lavender px-2.5 py-1 text-xs font-bold text-dena-brand">{statusLabels[order.status]}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-dena-muted">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/service-accounting?${status ? `status=${status}&` : ""}order=${order.id}#order-detail`} className="font-bold text-dena-brand hover:underline">مشاهده</Link></td>
                </tr>)}
              </tbody>
            </table>
          </div> : <div className="p-6 text-sm text-dena-muted">برای این وضعیت سفارشی ثبت نشده است.</div>}
        </Card>
      </section>

      {selectedOrder && <Card id="order-detail" className="space-y-4 scroll-mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-dena-brand">جزئیات سفارش</p>
          <h2 className="mt-1 text-lg font-extrabold text-dena-deep">{selectedOrder.title}</h2></div>
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">{statusLabels[selectedOrder.status]}</span></div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="مؤسسه" value={selectedOrder.instituteName} /><Detail label="قیمت ثبت‌شده" value={formatToman(selectedOrder.priceToman)} />
          <Detail label="سهم دنا" value={formatToman(Math.floor(selectedOrder.denaShareRials / 10))} /><Detail label="سهم مؤسسه" value={formatToman(Math.floor(selectedOrder.instituteShareRials / 10))} />
          <Detail label="تاریخ سفارش" value={formatDate(selectedOrder.createdAt)} /><Detail label="تاریخ پرداخت" value={selectedOrder.paidAt ? formatDate(selectedOrder.paidAt) : "پرداخت ثبت نشده"} />
          <Detail label="شناسهٔ سفارش" value={selectedOrder.id} />
        </dl>
      </Card>}
    </main>
  </AdminShell>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <Card className="space-y-2 p-4"><p className="text-xs font-bold text-dena-muted">{label}</p>
    <p className="break-words text-xl font-extrabold text-dena-deep">{value}</p><p className="text-xs leading-5 text-dena-muted">{note}</p></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl bg-dena-bg p-3"><dt className="text-xs text-dena-muted">{label}</dt>
    <dd className="mt-1 break-all text-sm font-bold text-dena-deep">{value}</dd></div>;
}
