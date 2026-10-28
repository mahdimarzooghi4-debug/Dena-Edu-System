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
    category: "مشاوره",
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
    description: "گفت‌وگوی نمونه برای مشخص‌کردن مبحث دشوار و برنامهٔ پیگیری.",
    priceToman: 150000,
    includedMinutes: 30,
    validityDays: 14,
    guardianConsentRequired: false,
    cancellationPolicy: "لغو درخواست طبق شرایط مؤسسه انجام می‌شود؛ این شرط در نسخهٔ نمایشی نمونه است.",
  },
];

const statusLabel: Record<DemoOrder["status"], string> = {
  awaiting_guardian_consent: "در انتظار تأیید مؤسسه دربارهٔ رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  cancelled: "لغوشده",
};

export function StudentDemoServiceCenter() {
  const [view, setView] = useState<"catalog" | "orders">("catalog");
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [message, setMessage] = useState("");

  function requestService(service: Service) {
    if (orders.some((order) => order.serviceId === service.id && order.status !== "cancelled")) {
      setView("orders");
      setMessage("برای این خدمت یک درخواست نمونهٔ باز داری.");
      return;
    }
    const order: DemoOrder = {
      id: `demo-${service.id}-${Date.now()}`,
      serviceId: service.id,
      title: service.title,
      priceToman: service.priceToman,
      status: service.guardianConsentRequired ? "awaiting_guardian_consent" : "awaiting_payment",
    };
    setOrders((current) => [order, ...current]);
    setMessage(service.guardianConsentRequired
      ? "درخواست نمونه فقط در همین صفحه ایجاد شد و تا تأیید مؤسسه دربارهٔ رضایت سرپرست متوقف می‌ماند."
      : "درخواست نمونه فقط در همین صفحه ایجاد شد؛ پرداخت آنلاین فعال نیست.");
  }

  function cancelOrder(orderId: string) {
    setOrders((current) => current.map((order) =>
      order.id === orderId ? { ...order, status: "cancelled" } : order,
    ));
    setMessage("درخواست نمونه لغو شد؛ هیچ درخواست واقعی به سرور نرفته است.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-dena-brand">خدمات تکمیلی آموزش · دادهٔ نمونه</p>
            <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">خدمات مؤسسه‌ها</h2>
            <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
              خدمات و شرایط نمونه را ببین و روند درخواست را در همین پیش‌نمایش مرور کن.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={view === "orders"}
            onClick={() => { setView(view === "orders" ? "catalog" : "orders"); setMessage(""); }}
            className={buttonClassName(view === "orders" ? "secondary" : "outline")}
          >
            {view === "orders" ? "بازگشت به خدمات" : `درخواست‌های من · ${orders.length.toLocaleString("fa-IR")}`}
          </button>
        </div>
      </section>

      <Card className="border-amber-300 bg-amber-50 text-sm leading-7 text-amber-950">
        ثبت درخواست به معنی خرید نیست. پرداخت آنلاین در نسخهٔ اصلی هنوز فعال نشده است و تا اتصال درگاه هیچ مبلغی دریافت نمی‌شود. این صفحه هم هیچ درخواست واقعی ثبت نمی‌کند.
      </Card>

      {message && <p role="status" aria-live="polite" className="rounded-xl border border-dena-border bg-white p-4 text-sm leading-7 text-dena-deep">{message}</p>}

      {view === "catalog" ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <li key={service.id}>
              <Card className="h-full space-y-4 rounded-[22px] p-5 md:p-6">
                <div>
                  <p className="text-xs font-bold text-dena-brand">{service.institute} · {service.category}</p>
                  <h3 className="mt-2 text-lg font-extrabold text-dena-deep">{service.title}</h3>
                </div>
                <p className="text-sm leading-7 text-dena-muted">{service.description}</p>
                <dl className="grid gap-3 rounded-xl bg-dena-bg p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-dena-muted">هزینهٔ نمونه</dt>
                    <dd className="font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} تومان</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-dena-muted">زمان استفاده</dt>
                    <dd className="font-semibold text-dena-deep">{service.includedMinutes.toLocaleString("fa-IR")} دقیقه · {service.validityDays.toLocaleString("fa-IR")} روز اعتبار</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-dena-muted">رضایت سرپرست</dt>
                    <dd className="font-semibold text-dena-deep">{service.guardianConsentRequired ? "لازم است" : "در تعریف نمونهٔ خدمت الزامی نیست"}</dd>
                  </div>
                </dl>
                <div className="border-t border-dena-border pt-3">
                  <h4 className="text-sm font-bold text-dena-deep">شرایط لغو نمونه</h4>
                  <p className="mt-1 text-sm leading-7 text-dena-muted">{service.cancellationPolicy}</p>
                </div>
                <div className="space-y-2">
                  <button type="button" onClick={() => requestService(service)} className={buttonClassName()}>
                    {orders.some((order) => order.serviceId === service.id && order.status !== "cancelled") ? "دیدن درخواست باز" : "درخواست نمونهٔ این خدمت"}
                  </button>
                  {service.guardianConsentRequired && <p className="text-xs leading-6 text-dena-muted">ابتدا تأیید مؤسسه دربارهٔ رضایت سرپرست لازم است؛ سپس پرداخت قابل پیگیری خواهد بود.</p>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        orders.length === 0 ? (
          <Card className="space-y-3 text-center">
            <h3 className="font-extrabold text-dena-deep">درخواست نمونه‌ای وجود ندارد</h3>
            <p className="text-sm leading-7 text-dena-muted">از فهرست خدمات یک درخواست نمایشی بساز تا وضعیتش را اینجا ببینی.</p>
            <button type="button" onClick={() => { setView("catalog"); setMessage(""); }} className={buttonClassName("outline")}>دیدن خدمات</button>
          </Card>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Card className="space-y-4 rounded-[22px]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-dena-brand">مؤسسهٔ نمونهٔ دنا</p>
                      <h3 className="mt-2 font-extrabold text-dena-deep">{order.title}</h3>
                    </div>
                    <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-deep">{statusLabel[order.status]}</span>
                  </div>
                  <p className="text-sm text-dena-muted">مبلغ اعلام‌شده: {order.priceToman.toLocaleString("fa-IR")} تومان · پرداخت ثبت نشده</p>
                  {order.status !== "cancelled" && <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-950">
                    <p>{order.status === "awaiting_guardian_consent"
                      ? "در جریان واقعی، مؤسسه باید دریافت رضایت سرپرست برای همین درخواست را تأیید کند. تا آن زمان پرداخت یا ارائهٔ خدمت انجام نمی‌شود."
                      : "درخواست در انتظار پرداخت می‌ماند؛ پرداخت آنلاین فعال نیست و هیچ وجهی دریافت نشده است."}</p>
                    <button type="button" onClick={() => cancelOrder(order.id)} className="font-bold underline">لغو درخواست نمونه</button>
                  </div>}
                  {order.status === "cancelled" && <p className="text-sm text-dena-muted">درخواست فقط در این صفحه لغو شده است.</p>}
                </Card>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
