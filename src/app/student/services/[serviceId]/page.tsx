import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { ServiceOrderAction } from "@/components/student/service-order-action";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentServiceCatalog } from "@/server/institute/services";
import { getStudentServiceOrders } from "@/server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات خدمت | دنا", robots: { index: false, follow: false } };

const categoryLabel: Record<string, string> = {
  consultation: "مشاوره",
  career_guidance: "انتخاب رشته و مسیر شغلی",
  assessment: "ارزیابی آموزشی",
  support: "پشتیبانی آموزشی",
  other: "سایر خدمات",
};

export default async function StudentServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();

  const { serviceId } = await params;
  const [catalog, orders] = await Promise.all([
    getStudentServiceCatalog(),
    getStudentServiceOrders(actor.userId),
  ]);
  const service = catalog.services.find((item) => item.id === serviceId);
  if (!service) notFound();

  const order = orders.find((item) => item.serviceId === service.id);

  return (
    <StudentShell active="services" title="خدمات مؤسسه‌ها">
      <div className="mx-auto max-w-3xl space-y-5">
        <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-sm">
          <Link href="/student/services" className="font-semibold text-dena-brand hover:underline">خدمات مؤسسه‌ها</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="text-dena-muted">جزئیات خدمت</span>
        </nav>
        <Card className="space-y-5 rounded-[22px] p-5 md:p-7">
          <header className="space-y-2 text-right">
            <p className="text-sm font-bold text-dena-brand">{service.instituteName} · {categoryLabel[service.category] ?? "خدمت آموزشی"}</p>
            <h2 className="text-2xl font-extrabold text-dena-deep">{service.title}</h2>
            <p className="text-sm leading-8 text-dena-muted">{service.description}</p>
          </header>
          <dl className="grid gap-3 rounded-xl bg-dena-bg p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-dena-muted">هزینهٔ اعلام‌شده</dt>
              <dd className="font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} تومان</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-dena-muted">زمان استفاده</dt>
              <dd className="text-left font-semibold text-dena-deep">
                {service.includedMinutes === null
                  ? "سهمیهٔ زمانی ندارد"
                  : `${service.includedMinutes.toLocaleString("fa-IR")} دقیقه · ${service.validityDays?.toLocaleString("fa-IR")} روز اعتبار`}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-dena-muted">رضایت سرپرست</dt>
              <dd className="text-left font-semibold text-dena-deep">
                {service.guardianConsentRequired ? "لازم است" : "در تعریف این خدمت الزامی نیست"}
              </dd>
            </div>
          </dl>
          <section className="space-y-2 border-t border-dena-border pt-4">
            <h3 className="font-extrabold text-dena-deep">شرایط لغو و بازپرداخت</h3>
            <p className="text-sm leading-7 text-dena-muted">{service.cancellationPolicy}</p>
          </section>
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            ثبت درخواست در دسترس است؛ پرداخت آنلاین هنوز فعال نشده است.
          </p>
          <ServiceOrderAction
            serviceId={service.id}
            guardianConsentRequired={service.guardianConsentRequired}
            order={order}
          />
        </Card>
      </div>
    </StudentShell>
  );
}
