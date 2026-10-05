import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ServiceOrderAction } from "../../../../components/student/service-order-action";
import { StudentShell } from "../../../../components/student/student-shell";
import { Card } from "../../../../components/ui/card";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getStudentServiceOrders } from "../../../../server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "درخواست‌های خدمات من | دنا", robots: { index: false, follow: false } };

const statusLabel: Record<string, string> = {
  awaiting_guardian_consent: "در انتظار تأیید مؤسسه دربارهٔ رضایت",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
});

export default async function StudentServiceOrdersPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();

  const orders = await getStudentServiceOrders(actor.userId);

  return <StudentShell active="services" title="درخواست‌های خدمات من">
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <div>
          <p className="text-sm font-bold text-dena-brand">پیگیری درخواست‌ها</p>
          <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">درخواست‌های خدمات من</h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            وضعیت درخواست‌ها حتی پس از توقف یا حذف خدمت از کاتالوگ اینجا باقی می‌ماند.
          </p>
        </div>
        <Link href="/student/services" className="min-h-11 rounded-xl border border-dena-brand bg-white px-4 py-2 text-sm font-bold text-dena-brand">
          بازگشت به خدمات
        </Link>
      </section>

      <Card className="border-amber-300 bg-amber-50 text-sm leading-7 text-amber-950">
        ثبت درخواست به معنی خرید نیست. پرداخت آنلاین هنوز فعال نشده و تا اتصال درگاه هیچ مبلغی دریافت نمی‌شود.
      </Card>

      {orders.length === 0 ? <Card className="space-y-3 text-center">
        <h3 className="font-extrabold text-dena-deep">هنوز درخواستی ثبت نکرده‌ای</h3>
        <p className="text-sm leading-7 text-dena-muted">خدمات تکمیلی مؤسسه‌ها را ببین و در صورت نیاز درخواست ثبت کن.</p>
        <Link href="/student/services" className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-4 py-2 text-sm font-bold text-white">
          دیدن خدمات مؤسسه‌ها
        </Link>
      </Card> : <ul className="space-y-4">
        {orders.map((order) => <li key={order.id}>
          <Card className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-dena-brand">{order.instituteName}</p>
                <h3 className="mt-2 text-lg font-extrabold text-dena-deep">{order.title}</h3>
              </div>
              <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-deep">
                {statusLabel[order.status] ?? "وضعیت نامشخص"}
              </span>
            </div>

            <dl className="grid gap-3 rounded-xl bg-dena-bg p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-dena-muted">مبلغ اعلام‌شده</dt><dd className="mt-1 font-bold text-dena-deep">{order.priceToman.toLocaleString("fa-IR")} تومان</dd></div>
              <div><dt className="text-xs text-dena-muted">سهمیهٔ زمانی</dt><dd className="mt-1 font-bold text-dena-deep">{order.includedMinutes === null ? "ندارد" : `${order.includedMinutes.toLocaleString("fa-IR")} دقیقه`}</dd></div>
              <div><dt className="text-xs text-dena-muted">اعتبار خدمت</dt><dd className="mt-1 font-bold text-dena-deep">{order.validityDays === null ? "اعلام نشده" : `${order.validityDays.toLocaleString("fa-IR")} روز`}</dd></div>
              <div><dt className="text-xs text-dena-muted">زمان ثبت</dt><dd className="mt-1 font-bold text-dena-deep">{dateFormatter.format(order.createdAt)}</dd></div>
            </dl>

            <ServiceOrderAction
              serviceId={order.serviceId}
              guardianConsentRequired={order.guardianConsentRequired}
              order={order}
              allowRetry={false}
            />
          </Card>
        </li>)}
      </ul>}
    </div>
  </StudentShell>;
}
