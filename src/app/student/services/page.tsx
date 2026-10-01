import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { StudentShell } from "../../../components/student/student-shell";
import { ServiceOrderAction } from "../../../components/student/service-order-action";
import { getServerAccessContext } from "../../../server/access/actor";
import { getStudentServiceCatalog } from "../../../server/institute/services";
import { getStudentServiceOrders } from "../../../server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خدمات مؤسسه‌ها | دنا", robots: { index: false, follow: false } };

const categoryLabel: Record<string, string> = {
  consultation: "مشاوره", career_guidance: "انتخاب رشته و مسیر شغلی",
  assessment: "ارزیابی آموزشی", support: "پشتیبانی آموزشی", other: "سایر خدمات",
};

export default async function StudentServicesPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();
  const [catalog, orders] = await Promise.all([
    getStudentServiceCatalog(),
    getStudentServiceOrders(actor.userId),
  ]);
  const latestOrderByService = new Map<string, (typeof orders)[number]>();
  for (const order of orders) {
    if (!latestOrderByService.has(order.serviceId)) latestOrderByService.set(order.serviceId, order);
  }

  return <StudentShell active="services" title="خدمات مؤسسه‌ها">
    <div className="space-y-6">
      <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-bold text-dena-brand">خدمات تکمیلی آموزش</p>
            <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">خدمات مؤسسه‌ها</h2>
            <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
              خدمات مشاوره، انتخاب رشته، ارزیابی و پشتیبانی مؤسسه‌ها را همراه قیمت و شرایط استفاده ببین.
            </p></div>
          <Link href="/student/services/orders" className="min-h-11 rounded-xl border border-dena-brand bg-white px-4 py-2 text-sm font-bold text-dena-brand">
            درخواست‌های من
          </Link>
        </div>
      </section>
      <Card className="border-amber-300 bg-amber-50 text-sm leading-7 text-amber-950">
        ثبت درخواست بدون دریافت وجه ممکن است. اگر رضایت سرپرست لازم باشد، درخواست تا ثبت رضایت معتبر متوقف می‌ماند؛ پرداخت آنلاین هنوز فعال نیست.
      </Card>
      {catalog.services.length === 0 ? <Card className="space-y-2">
        <h3 className="font-extrabold text-dena-deep">هنوز خدمتی برای نمایش منتشر نشده است</h3>
        <p className="text-sm leading-7 text-dena-muted">وقتی مؤسسه‌ها خدمات خود را فعال کنند، جزئیات همین‌جا نمایش داده می‌شود.</p>
      </Card> : <ul className="grid gap-4 md:grid-cols-2">
        {catalog.services.map((service) => <li key={service.id}><Card className="h-full space-y-4">
          <div><p className="text-xs font-bold text-dena-brand">{service.instituteName} · {categoryLabel[service.category] ?? "خدمت آموزشی"}</p>
            <h3 className="mt-2 text-lg font-extrabold text-dena-deep">{service.title}</h3></div>
          <p className="text-sm leading-7 text-dena-muted">{service.description}</p>
          <dl className="grid gap-3 rounded-xl bg-dena-bg p-4 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-dena-muted">هزینهٔ اعلام‌شده</dt><dd className="font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} تومان</dd></div>
            <div className="flex items-start justify-between gap-4"><dt className="shrink-0 text-dena-muted">زمان استفاده</dt><dd className="text-left font-semibold text-dena-deep">{service.includedMinutes === null ? "سهمیهٔ زمانی ندارد" : `${service.includedMinutes.toLocaleString("fa-IR")} دقیقه · ${service.validityDays?.toLocaleString("fa-IR")} روز اعتبار`}</dd></div>
            <div className="flex items-start justify-between gap-4"><dt className="shrink-0 text-dena-muted">رضایت سرپرست</dt><dd className="text-left font-semibold text-dena-deep">{service.guardianConsentRequired ? "لازم است" : "در تعریف این خدمت الزامی نیست"}</dd></div>
          </dl>
          <div className="border-t border-dena-border pt-3">
            <h4 className="text-sm font-bold text-dena-deep">شرایط لغو و بازپرداخت</h4>
            <p className="mt-1 text-sm leading-7 text-dena-muted">{service.cancellationPolicy}</p>
          </div>
          <ServiceOrderAction
            serviceId={service.id}
            guardianConsentRequired={service.guardianConsentRequired}
            order={latestOrderByService.get(service.id)}
          />
        </Card></li>)}
      </ul>}
    </div>
  </StudentShell>;
}
