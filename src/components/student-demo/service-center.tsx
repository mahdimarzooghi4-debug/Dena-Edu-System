"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

type Service = {
  id: string;
  category: string;
  title: string;
  institute: string;
  description: string;
  priceToman: number;
  includedMinutes: number;
  validityDays: number;
  guardianConsentRequired: boolean;
  cancellationPolicy: string;
};

type DemoOrder = {
  id: string;
  serviceId: string;
  title: string;
  priceToman: number;
  status: "awaiting_guardian_consent" | "awaiting_payment" | "cancelled";
};

const services: Service[] = [
  {
    id: "weekly-study-consultation",
    category: "مشاوره تحصیلی",
    title: "مشاورهٔ برنامه‌ریزی هفتگی",
    institute: "مؤسسهٔ نمونهٔ دنا",
    description: "مرور برنامهٔ درسی و تنظیم هدف‌های قابل پیگیری برای هفتهٔ آینده.",
    priceToman: 350000,
    includedMinutes: 45,
    validityDays: 30,
    guardianConsentRequired: true,
    cancellationPolicy: "لغو درخواست تا پیش از تأیید مؤسسه ممکن است؛ این شرط در نسخهٔ عملیاتی باید از کاتالوگ مؤسسه خوانده شود.",
  },
  {
    id: "study-support",
    category: "پشتیبانی آموزشی",
    title: "جلسهٔ رفع اشکال تحصیلی",
    institute: "مؤسسهٔ نمونهٔ دنا",
    description: "گفت‌وگویی برای مشخص‌کردن مبحث دشوار و برنامهٔ پیگیری یادگیری.",
    priceToman: 150000,
    includedMinutes: 30,
    validityDays: 14,
    guardianConsentRequired: false,
    cancellationPolicy: "لغو درخواست طبق شرایط مؤسسه انجام می‌شود؛ این شرط در نسخهٔ نمایشی نمونه است.",
  },
];

const statusLabel: Record<DemoOrder["status"], string> = {
  awaiting_guardian_consent: "در انتظار بررسی رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  cancelled: "لغوشده",
};

const categories = ["همهٔ خدمات", ...Array.from(new Set(services.map((service) => service.category)))];

function ServiceIcon({ category }: { category: string }) {
  return (
    <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-2xl ${category === "مشاوره تحصیلی" ? "bg-indigo-100 text-indigo-700" : "bg-cyan-100 text-cyan-700"}`}>
      {category === "مشاوره تحصیلی" ? (
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v11H8l-4 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      )}
    </span>
  );
}

export function StudentDemoServiceCenter() {
  const [view, setView] = useState<"catalog" | "orders">("catalog");
  const [category, setCategory] = useState("همهٔ خدمات");
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [message, setMessage] = useState("");
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const openOrders = orders.filter((order) => order.status !== "cancelled");
  const visibleServices = category === "همهٔ خدمات" ? services : services.filter((service) => service.category === category);

  function requestService(service: Service) {
    if (orders.some((order) => order.serviceId === service.id && order.status !== "cancelled")) {
      setView("orders");
      setMessage("برای این خدمت یک درخواست نمونهٔ باز داری.");
      return;
    }
    const order: DemoOrder = {
      id: `demo-${service.id}-${nextOrderNumber}`,
      serviceId: service.id,
      title: service.title,
      priceToman: service.priceToman,
      status: service.guardianConsentRequired ? "awaiting_guardian_consent" : "awaiting_payment",
    };
    setNextOrderNumber((current) => current + 1);
    setOrders((current) => [order, ...current]);
    setMessage(service.guardianConsentRequired
      ? "درخواست نمونه در همین صفحه ثبت شد و تا بررسی رضایت سرپرست متوقف می‌ماند."
      : "درخواست نمونه فقط در همین صفحه ایجاد شد؛ پرداخت آنلاین فعال نیست.");
  }

  function cancelOrder(orderId: string) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: "cancelled" } : order));
    setMessage("درخواست نمونه لغو شد؛ هیچ درخواست واقعی به سرور نرفته است.");
  }

  return (
    <div dir="rtl" className="space-y-6 text-right md:space-y-7">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-l from-[#21166f] via-[#4938c8] to-[#6251ed] px-5 py-6 text-white shadow-[0_18px_45px_-24px_rgba(69,54,200,.62)] md:px-8 md:py-8">
        <div aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-56 rounded-full border-[34px] border-white/5" />
        <div aria-hidden="true" className="absolute bottom-[-76px] left-[34%] -z-10 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-50">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              خدمات آموزشی دنا
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-relaxed md:text-[32px]">مرکز خدمات</h2>
            <p className="mt-1 text-sm leading-7 text-indigo-100 md:text-base">خدمات آموزشی را ببین، جزئیات را مقایسه کن و درخواست‌هایت را پیگیری کن.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:min-w-[350px] md:gap-3">
            {[
              [services.length.toLocaleString("fa-IR"), "خدمت نمونه"],
              [(categories.length - 1).toLocaleString("fa-IR"), "دستهٔ خدمات"],
              [openOrders.length.toLocaleString("fa-IR"), "درخواست باز"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 px-2 py-3 text-center backdrop-blur-sm md:px-4 md:py-4">
                <p className="text-xl font-extrabold md:text-2xl">{value}</p>
                <p className="mt-1 text-[10px] leading-5 text-indigo-100 md:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-3 border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-amber-700">!</span>
        <p className="text-xs leading-6 sm:text-sm">اطلاعات و هزینه‌ها نمونه‌اند. این پیش‌نمایش درخواست واقعی یا پرداخت ثبت نمی‌کند و دریافت وجهی انجام نمی‌شود.</p>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-2xl border border-dena-border bg-white p-1">
          <button type="button" aria-pressed={view === "catalog"} onClick={() => { setView("catalog"); setMessage(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === "catalog" ? "bg-dena-brand text-white shadow-sm" : "text-dena-muted hover:bg-dena-bg"}`}>خدمات</button>
          <button type="button" aria-pressed={view === "orders"} onClick={() => { setView("orders"); setMessage(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === "orders" ? "bg-dena-brand text-white shadow-sm" : "text-dena-muted hover:bg-dena-bg"}`}>
            درخواست‌های من <span className="mr-1 opacity-80">({orders.length.toLocaleString("fa-IR")})</span>
          </button>
        </div>
        {view === "catalog" && <p className="text-xs text-dena-muted">خدمات موجود در پیش‌نمایش: {visibleServices.length.toLocaleString("fa-IR")}</p>}
      </div>

      {message && <p role="status" aria-live="polite" className="rounded-xl border border-dena-border bg-white p-4 text-sm leading-7 text-dena-deep">{message}</p>}

      {view === "catalog" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2" aria-label="دسته‌بندی خدمات">
            {categories.map((item) => (
              <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${category === item ? "border-dena-brand bg-dena-brand text-white" : "border-dena-border bg-white text-dena-muted hover:border-dena-brand/40 hover:text-dena-brand"}`}>
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {visibleServices.map((service) => {
              const hasOpenRequest = orders.some((order) => order.serviceId === service.id && order.status !== "cancelled");
              return (
                <Card key={service.id} className="group flex h-full flex-col overflow-hidden rounded-[24px] border-dena-border p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4 border-b border-dena-border bg-gradient-to-l from-dena-lavender/70 to-white p-5 md:p-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <ServiceIcon category={service.category} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-dena-brand">{service.category}</p>
                        <h3 className="mt-1 text-base font-extrabold leading-7 text-dena-deep md:text-lg">{service.title}</h3>
                        <p className="mt-1 text-xs text-dena-muted">{service.institute}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${hasOpenRequest ? "bg-emerald-100 text-emerald-800" : "bg-white text-dena-muted"}`}>
                      {hasOpenRequest ? "درخواست باز" : "قابل بررسی"}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
                    <p className="text-sm leading-7 text-dena-muted">{service.description}</p>
                    <dl className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-dena-bg p-3">
                        <dt className="text-[11px] text-dena-muted">هزینهٔ نمونه</dt>
                        <dd className="mt-1 text-sm font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} <span className="text-[10px] font-medium">تومان</span></dd>
                      </div>
                      <div className="rounded-2xl bg-dena-bg p-3">
                        <dt className="text-[11px] text-dena-muted">مدت جلسه</dt>
                        <dd className="mt-1 text-sm font-extrabold text-dena-deep">{service.includedMinutes.toLocaleString("fa-IR")} دقیقه</dd>
                      </div>
                      <div className="rounded-2xl bg-dena-bg p-3">
                        <dt className="text-[11px] text-dena-muted">مهلت استفاده</dt>
                        <dd className="mt-1 text-sm font-extrabold text-dena-deep">{service.validityDays.toLocaleString("fa-IR")} روز</dd>
                      </div>
                      <div className="rounded-2xl bg-dena-bg p-3">
                        <dt className="text-[11px] text-dena-muted">رضایت سرپرست</dt>
                        <dd className="mt-1 text-sm font-extrabold text-dena-deep">{service.guardianConsentRequired ? "نیاز به بررسی" : "طبق شرایط خدمت"}</dd>
                      </div>
                    </dl>
                    <details className="rounded-xl border border-dena-border px-4 py-3">
                      <summary className="cursor-pointer text-xs font-bold text-dena-brand">مشاهدهٔ شرایط لغو</summary>
                      <p className="mt-3 text-xs leading-6 text-dena-muted">{service.cancellationPolicy}</p>
                    </details>
                    <div className="mt-auto space-y-2 border-t border-dena-border pt-4">
                      <button type="button" onClick={() => requestService(service)} className={buttonClassName()}>
                        {hasOpenRequest ? "پیگیری درخواست" : "ثبت درخواست نمونه"}
                      </button>
                      {service.guardianConsentRequired && <p className="text-[11px] leading-6 text-dena-muted">پیش از پرداخت، رضایت سرپرست باید بررسی شود.</p>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : orders.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-[24px] border-dashed p-8 text-center md:p-12">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-dena-lavender text-2xl text-dena-brand">◷</span>
          <h3 className="font-extrabold text-dena-deep">هنوز درخواستی نداری</h3>
          <p className="max-w-md text-sm leading-7 text-dena-muted">بعد از انتخاب یک خدمت، وضعیت درخواست نمونه را در همین قسمت می‌بینی.</p>
          <button type="button" onClick={() => { setView("catalog"); setMessage(""); }} className={buttonClassName("outline")}>دیدن خدمات</button>
        </Card>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Card className="space-y-4 rounded-[24px] border-dena-border p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ServiceIcon category={services.find((service) => service.id === order.serviceId)?.category ?? ""} />
                    <div>
                      <p className="text-xs font-bold text-dena-brand">مؤسسهٔ نمونهٔ دنا</p>
                      <h3 className="mt-1 font-extrabold text-dena-deep">{order.title}</h3>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${order.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-900"}`}>{statusLabel[order.status]}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dena-border pt-4">
                  <p className="text-sm text-dena-muted">مبلغ اعلام‌شده: <span className="font-bold text-dena-deep">{order.priceToman.toLocaleString("fa-IR")} تومان</span> · پرداخت ثبت نشده</p>
                  {order.status !== "cancelled" && <button type="button" onClick={() => cancelOrder(order.id)} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50">لغو درخواست نمونه</button>}
                </div>
                {order.status !== "cancelled" && <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-950">
                  {order.status === "awaiting_guardian_consent"
                    ? "در جریان واقعی، مؤسسه باید دریافت رضایت سرپرست برای همین درخواست را تأیید کند. تا آن زمان پرداخت یا ارائهٔ خدمت انجام نمی‌شود."
                    : "درخواست در انتظار پرداخت می‌ماند؛ پرداخت آنلاین فعال نیست و هیچ وجهی دریافت نشده است."}
                </div>}
                {order.status === "cancelled" && <p className="text-sm text-dena-muted">این درخواست نمونه فقط در همین صفحه لغو شده است.</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
