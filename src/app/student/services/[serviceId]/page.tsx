import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

const statusLabel: Record<string, string> = {
  awaiting_guardian_consent: "در انتظار رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
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
  const currentStep = !order || order.status === "cancelled"
    ? 1
    : order.status === "awaiting_guardian_consent"
      ? 2
      : order.status === "awaiting_payment"
        ? 4
        : 4;

  const steps = [
    { title: "ثبت درخواست", description: "درخواست خدمت برای همین حساب دانش‌آموز ثبت می‌شود." },
    { title: "رضایت سرپرست", description: service.guardianConsentRequired ? "رضایت برای همین درخواست بررسی می‌شود." : "برای این خدمت الزامی تعریف نشده است." },
    { title: "تعیین زمان", description: "زمان جلسه پس از بررسی مؤسسه در بخش درخواست‌های خدمات نمایش داده می‌شود." },
    { title: "پرداخت جداگانه", description: "پرداخت از شهریهٔ دوره جداست؛ درگاه آنلاین هنوز فعال نیست." },
  ];

  return (
    <StudentShell active="services" title="مرکز خدمات" mobileNav="service" mobileServiceActive="center">
      <div className="mx-auto w-full max-w-[704px] space-y-5">
        <nav aria-label="مسیر صفحه" className="text-[10px] text-dena-muted">
          <Link href="/student" className="hover:text-dena-brand hover:underline">خانه من</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/student/services" className="hover:text-dena-brand hover:underline">مرکز خدمات</Link>
          <span aria-hidden="true"> / </span>
          <span>جزئیات خدمت</span>
        </nav>

        <header className="space-y-2 text-right">
          <h1 className="text-[22px] font-extrabold leading-[1.5] text-dena-deep md:text-[28px]">{service.title}</h1>
          <p className="text-xs leading-6 text-dena-muted">
            {service.instituteName} · {categoryLabel[service.category] ?? "خدمت آموزشی"}
          </p>
        </header>

        <div className="grid items-start gap-4 md:grid-cols-2">
          <section aria-labelledby="service-detail-title" className="space-y-4 rounded-xl border border-dena-border bg-white p-4 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-dena-muted">اطلاعات منتشرشدهٔ مؤسسه</span>
              <h2 id="service-detail-title" className="text-base font-extrabold text-dena-deep">جزئیات خدمت</h2>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">اختیاری · منتشرشده</span>
              <p className="text-right text-[11px] font-semibold text-dena-muted">{categoryLabel[service.category] ?? "خدمت آموزشی"}</p>
            </div>
            <p className="text-xs leading-6 text-dena-ink">{service.description}</p>
            <ul className="space-y-2 text-[11px] leading-5 text-dena-ink">
              <li>✓ هزینه و شرایط استفاده پیش از ثبت درخواست نمایش داده می‌شود.</li>
              <li>✓ {service.includedMinutes === null
                ? "برای این خدمت سهمیهٔ زمانی تعریف نشده است."
                : `سهمیهٔ ${service.includedMinutes.toLocaleString("fa-IR")} دقیقه‌ای با ${service.validityDays?.toLocaleString("fa-IR")} روز اعتبار.`}</li>
              <li>✓ {service.guardianConsentRequired
                ? "رضایت سرپرست برای این درخواست لازم است."
                : "در تعریف این خدمت رضایت سرپرست الزامی نیست."}</li>
            </ul>

            <div className="space-y-2 rounded-xl border-r-2 border-amber-500 bg-amber-50 p-3 text-right">
              <h3 className="text-xs font-extrabold text-amber-800">لغو و بازپرداخت</h3>
              <p className="text-[11px] leading-5 text-dena-ink">{service.cancellationPolicy}</p>
            </div>
            <div className="space-y-1 rounded-xl border-r-2 border-dena-brand bg-dena-lavender p-3 text-right">
              <h3 className="text-xs font-extrabold text-dena-brand">حریم خصوصی</h3>
              <p className="text-[11px] leading-5 text-dena-ink">
                فقط اطلاعات لازم برای ارائهٔ همین خدمت در دنا استفاده می‌شود؛ شماره تماس شخصی یا پیوند جلسهٔ خارجی نمایش داده نمی‌شود.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 rounded-xl bg-dena-bg p-3 text-[10px]">
              <div>
                <dt className="text-dena-muted">هزینهٔ اعلام‌شده</dt>
                <dd className="mt-1 font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} تومان</dd>
              </div>
              <div>
                <dt className="text-dena-muted">وضعیت درخواست</dt>
                <dd className="mt-1 font-bold text-dena-brand">{order ? statusLabel[order.status] : "هنوز ثبت نشده"}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="booking-title" className="space-y-4 rounded-xl border border-dena-border bg-white p-4 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-dena-muted">گام‌های داخل دنا</span>
              <h2 id="booking-title" className="text-base font-extrabold text-dena-deep">رزرو و پرداخت خدمت</h2>
            </div>
            <ol className="space-y-2.5">
              {steps.map((step, index) => {
                const number = index + 1;
                const active = number === currentStep;
                const complete = number < currentStep || order?.status === "paid";
                return (
                  <li key={step.title} className={`flex items-center gap-3 rounded-xl border p-3 ${active ? "border-dena-brand bg-dena-lavender" : "border-dena-border bg-dena-bg"}`}>
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-dena-brand text-white" : "bg-white text-dena-muted"}`}>
                      {complete ? "✓" : number.toLocaleString("fa-IR")}
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="block text-xs font-extrabold text-dena-deep">{step.title}</span>
                      <span className="mt-1 block text-[10px] leading-5 text-dena-muted">{step.description}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="rounded-xl border-r-2 border-blue-500 bg-blue-50 p-3 text-right">
              <h3 className="text-xs font-extrabold text-blue-700">تأیید زمینهٔ خدمت</h3>
              <p className="mt-1 text-[11px] leading-5 text-dena-ink">
                ثبت درخواست فقط برای خدمت منتشرشده است. زمان دقیق پس از هماهنگی مؤسسه اعلام می‌شود و پرداخت تا فعال‌شدن درگاه انجام نمی‌شود.
              </p>
            </div>
            <ServiceOrderAction
              serviceId={service.id}
              guardianConsentRequired={service.guardianConsentRequired}
              order={order}
            />
          </section>
        </div>
      </div>
    </StudentShell>
  );
}
