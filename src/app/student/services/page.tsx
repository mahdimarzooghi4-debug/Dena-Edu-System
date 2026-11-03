import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentServiceCatalog } from "@/server/institute/services";
import { getStudentServiceOrders } from "@/server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مرکز خدمات | دنا",
  robots: { index: false, follow: false },
};

const categoryLabel: Record<string, string> = {
  consultation: "مشاوره",
  career_guidance: "انتخاب رشته و مسیر شغلی",
  assessment: "ارزیابی آموزشی",
  support: "پشتیبانی آموزشی",
  other: "سایر خدمات",
};

const orderStatusLabel: Record<string, string> = {
  awaiting_guardian_consent: "در انتظار رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
};

type SearchParams = Promise<{ q?: string; category?: string }>;

export default async function StudentServicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();

  const [{ services }, orders, filters] = await Promise.all([
    getStudentServiceCatalog(),
    getStudentServiceOrders(actor.userId),
    searchParams,
  ]);
  const query = filters.q?.trim().toLocaleLowerCase("fa-IR") ?? "";
  const selectedCategory = Object.hasOwn(categoryLabel, filters.category ?? "")
    ? filters.category!
    : "";
  const visibleServices = services.filter((service) => {
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    const haystack = `${service.title} ${service.instituteName} ${service.description}`.toLocaleLowerCase("fa-IR");
    return matchesCategory && (!query || haystack.includes(query));
  });
  const categoriesCount = new Set(services.map((service) => service.category)).size;
  const now = new Date();
  const upcomingAppointments = orders.reduce((count, order) => count + order.calls.filter(
    (call) => call.status === "scheduled" && call.scheduledAt.getTime() >= now.getTime(),
  ).length, 0);
  const awaitingConsentCount = orders.filter((order) => order.status === "awaiting_guardian_consent").length;
  const orderByService = new Map<string, (typeof orders)[number]>();
  for (const order of orders) if (!orderByService.has(order.serviceId)) orderByService.set(order.serviceId, order);

  return (
    <StudentShell active="services" title="مرکز خدمات">
      <div className="mx-auto w-full max-w-[704px] space-y-6">
        <section className="space-y-2 text-right">
          <nav aria-label="مسیر صفحه" className="text-[10px] text-dena-muted">
            <Link href="/student" className="hover:text-dena-brand hover:underline">خانه من</Link>
            <span aria-hidden="true"> / </span>
            <span>مرکز خدمات</span>
          </nav>
          <h2 className="text-[22px] font-extrabold leading-[1.5] text-dena-deep md:text-[28px]">
            خدمات اختیاری مؤسسه، شفاف و قابل پیگیری
          </h2>
          <p className="text-xs leading-6 text-dena-muted">
            خدمت مناسب را از مؤسسهٔ مشخص انتخاب کنید، زمان بگیرید و هزینه را جدا از ثبت‌نام دوره و شهریه در دنا بپردازید.
          </p>
          <span className="inline-flex rounded-full bg-dena-lavender px-3 py-1.5 text-[10px] font-bold text-dena-brand">
            وضعیت‌ها و مبالغ بر اساس اطلاعات واقعی حساب شما نمایش داده می‌شوند
          </span>
        </section>

        <Card className="flex items-start gap-3 rounded-xl border-blue-200 bg-blue-50 p-4 text-right">
          <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white text-blue-600">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div>
            <h3 className="text-xs font-extrabold text-blue-700">جلسه کاملاً در دنا برگزار می‌شود</h3>
            <p className="mt-1 text-[11px] leading-5 text-dena-ink">
              برای ورود به جلسه فقط از همین صفحه استفاده کنید. پیوند خارجی یا اطلاعات تماس شخصی نمایش داده نمی‌شود.
            </p>
          </div>
        </Card>

        <section aria-label="خلاصه مرکز خدمات" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "خدمت قابل رزرو", value: services.length, note: "منتشرشده توسط مؤسسه‌ها", color: "text-dena-brand" },
            { label: "دسته‌بندی", value: categoriesCount, note: "مقدار پویا", color: "text-blue-600" },
            { label: "نوبت پیش‌رو", value: upcomingAppointments, note: "برای حساب فعلی", color: "text-emerald-700" },
            { label: "در انتظار رضایت", value: awaitingConsentCount, note: "رضایت برای هر درخواست جداست", color: "text-amber-700" },
          ].map((metric) => (
            <Card key={metric.label} className="min-h-[108px] space-y-1.5 rounded-xl p-4">
              <p className="text-xs text-dena-muted">{metric.label}</p>
              <p className={`text-[23px] font-extrabold ${metric.color}`}>{metric.value.toLocaleString("fa-IR")}</p>
              <p className="text-[10px] text-dena-muted">{metric.note}</p>
            </Card>
          ))}
        </section>

        <section aria-labelledby="service-catalog-title" className="space-y-4 rounded-xl border border-dena-border bg-white p-4 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] text-dena-muted">
              <span>قیمت و ظرفیت پویا</span>
              <span className="hidden sm:inline">·</span>
              <Link href="/student/services/orders" className="hidden font-bold text-dena-brand hover:underline sm:inline">درخواست‌های من</Link>
            </div>
            <h2 id="service-catalog-title" className="text-base font-extrabold text-dena-deep">خدمات قابل انتخاب</h2>
          </div>

          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <label className="block text-[11px] font-semibold text-dena-deep">
              جستجو در خدمات
              <span className="mt-1 flex min-h-10 items-center gap-2 rounded-lg border border-dena-border bg-dena-bg px-3">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-dena-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" />
                </svg>
                <input name="q" defaultValue={filters.q ?? ""} placeholder="نام خدمت یا مؤسسه" className="min-w-0 flex-1 bg-transparent text-[11px] font-normal outline-none placeholder:text-dena-muted" />
              </span>
            </label>
            <label className="block text-[11px] font-semibold text-dena-deep">
              دسته‌بندی
              <select name="category" defaultValue={selectedCategory} className="mt-1 h-10 w-full rounded-lg border border-dena-border bg-dena-bg px-3 text-[11px] font-normal text-dena-ink outline-none focus:border-dena-brand">
                <option value="">همه دسته‌ها</option>
                {Object.entries(categoryLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <button type="submit" className="min-h-10 rounded-lg bg-dena-brand px-4 text-xs font-bold text-white hover:bg-dena-brand/90">اعمال فیلتر</button>
          </form>

          {visibleServices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-dena-border bg-dena-bg p-5 text-right">
              <h3 className="font-extrabold text-dena-deep">{services.length === 0 ? "هنوز خدمتی منتشر نشده است" : "خدمتی با این جستجو پیدا نشد"}</h3>
              <p className="mt-1 text-xs leading-6 text-dena-muted">
                {services.length === 0
                  ? "وقتی مؤسسه‌ها خدمت اختیاری خود را منتشر کنند، جزئیات و شرایط آن را همین‌جا می‌بینید."
                  : "عبارت جستجو یا دسته‌بندی را تغییر دهید."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-3">
              {visibleServices.map((service) => {
                const existingOrder = orderByService.get(service.id);
                const statusText = existingOrder ? orderStatusLabel[existingOrder.status] : null;
                return (
                  <li key={service.id} className="min-w-0">
                    <article className="flex h-full flex-col gap-3 rounded-2xl border border-dena-border bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-dena-lavender px-2.5 py-1 text-[10px] font-bold text-dena-brand">خدمت اختیاری</span>
                        {service.guardianConsentRequired && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">رضایت سرپرست</span>}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-dena-muted">{service.instituteName} · {categoryLabel[service.category] ?? "خدمت آموزشی"}</p>
                        <h3 className="mt-2 text-sm font-extrabold leading-6 text-dena-deep">{service.title}</h3>
                      </div>
                      <p className="line-clamp-3 text-[11px] leading-5 text-dena-muted">{service.description}</p>
                      <dl className="mt-auto space-y-2 rounded-xl bg-dena-bg p-3 text-[10px]">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-dena-muted">هزینه</dt>
                          <dd className="font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} تومان</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-dena-muted">زمان استفاده</dt>
                          <dd className="text-left font-semibold text-dena-deep">
                            {service.includedMinutes === null ? "بدون سهمیهٔ زمانی" : `${service.includedMinutes.toLocaleString("fa-IR")} دقیقه · ${service.validityDays?.toLocaleString("fa-IR")} روز`}
                          </dd>
                        </div>
                      </dl>
                      {statusText && <p className="rounded-lg bg-dena-lavender px-3 py-2 text-[10px] font-bold text-dena-brand">{statusText}</p>}
                      <Link href={`/student/services/${service.id}`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-dena-brand px-3 text-xs font-bold text-dena-brand hover:bg-dena-lavender">
                        جزئیات و ثبت درخواست
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="my-services-title" className="space-y-3 rounded-xl border border-dena-border bg-white p-4 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] text-dena-muted">سوابق حساب شما</div>
            <h2 id="my-services-title" className="text-base font-extrabold text-dena-deep">خدمات من</h2>
          </div>
          {orders.length === 0 ? (
            <p className="rounded-xl bg-dena-bg p-4 text-xs leading-6 text-dena-muted">هنوز درخواستی ثبت نکرده‌اید؛ درخواست‌های شما پس از ثبت در این بخش قابل پیگیری است.</p>
          ) : (
            <ul className="divide-y divide-dena-border">
              {orders.slice(0, 5).map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-dena-deep">{order.title}</p>
                    <p className="mt-1 text-[10px] text-dena-muted">{order.instituteName} · {order.createdAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "short" })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-dena-brand">{orderStatusLabel[order.status] ?? "در حال بررسی"}</span>
                    <span className="text-[10px] font-semibold text-dena-deep">{order.priceToman.toLocaleString("fa-IR")} تومان</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/student/services/orders" className="inline-flex min-h-10 items-center text-xs font-bold text-dena-brand hover:underline">مشاهدهٔ همهٔ درخواست‌ها</Link>
        </section>

        <p className="px-1 text-[10px] leading-5 text-dena-muted">
          هزینهٔ خدمت از شهریهٔ دوره جداست. ثبت درخواست به‌تنهایی به معنی پرداخت یا تأیید نوبت نیست؛ وضعیت هر مرحله در «خدمات من» نمایش داده می‌شود.
        </p>
      </div>
    </StudentShell>
  );
}
