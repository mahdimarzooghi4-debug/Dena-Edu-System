import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LiveKitCallRoom } from "../../../../../components/services/livekit-call-room";
import { StudentShell } from "../../../../../components/student/student-shell";
import { Card } from "../../../../../components/ui/card";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { formatServiceDuration } from "../../../../../server/institute/service-time-format";
import { getStudentServiceOrder } from "../../../../../server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات مشاوره | دنا", robots: { index: false, follow: false } };

const orderStatusLabel: Record<string, string> = {
  awaiting_guardian_consent: "در انتظار رضایت سرپرست",
  awaiting_payment: "در انتظار پرداخت",
  paid: "نوبت خریداری‌شده",
  cancelled: "درخواست لغوشده",
};
const callStatusLabel = {
  scheduled: "نوبت هماهنگ‌شده",
  started: "جلسه در حال برگزاری",
  ended: "جلسه پایان‌یافته",
  cancelled: "نوبت لغوشده",
} as const;
const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran",
});
const nextAppointmentFormatter = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran",
});

export default async function StudentServiceOrderDetailPage({
  params,
}: { params: Promise<{ orderId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  const order = await getStudentServiceOrder(actor.userId, orderId);
  if (!order) notFound();

  const nextCall = order.calls.find((call) => call.status === "scheduled" || call.status === "started");
  const primaryAction = nextCall?.status === "started" ? "#active-session" : "#appointment-status";

  if (order.status === "awaiting_guardian_consent") {
    redirect(`/student/services/orders/${order.id}/consent`);
  }

  if (nextCall?.status === "started") {
    return <StudentShell active="services" title="جلسه درون دنا" mobileNav="service" mobileServiceActive="orders">
      <div className="mx-auto w-full max-w-[520px] md:max-w-4xl">
        <LiveKitCallRoom callId={nextCall.id} messageHref={`/service-orders/${order.id}/messages`} />
      </div>
    </StudentShell>;
  }

  const completedCall = [...order.calls].reverse().find((call) => call.status === "ended" && call.followUp);
  if (completedCall?.followUp) {
    const nextAppointment = order.calls.find((call) => call.status === "scheduled" && call.scheduledAt > new Date());
    const firstNextStep = completedCall.followUp.nextSteps[0];
    return <StudentShell active="services" title="خلاصه پیگیری" mobileNav="service" mobileServiceActive="orders">
      <div className="mx-auto w-full max-w-[520px] space-y-3">
        <section aria-label="پایان موفق جلسه" className="flex flex-col items-center gap-2 py-1 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[#d9f8ef]">
            <Image src="/figma/student-services/check.svg" alt="" width={26} height={26} />
          </span>
          <h2 className="text-lg font-extrabold leading-normal text-dena-deep">جلسه با موفقیت پایان یافت</h2>
        </section>

        <section aria-label="خلاصه پیگیری" className="space-y-2.5 rounded-xl border border-dena-border bg-white p-4 shadow-[0_8px_12px_rgba(91,76,226,0.08)]">
          <h3 className="text-[15px] font-extrabold leading-normal text-dena-deep">خلاصه پیگیری</h3>
          <p className="text-[10px] leading-[1.7] text-dena-deep">{completedCall.followUp.summary}</p>

          {firstNextStep && <div className="flex items-center gap-3 rounded-lg border-r-[3px] border-[#24886b] bg-[#d9f8ef] p-3.5">
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs font-extrabold text-[#24886b]">گام بعدی</p>
              <p className="mt-1 text-[11px] leading-[1.6] text-dena-deep">{firstNextStep}</p>
            </div>
            <Image src="/figma/student-services/check-circle-2.svg" alt="" width={18} height={18} />
          </div>}

          <div className="flex flex-wrap gap-2">
            {completedCall.sharedFileCount > 0 && <Link href={`/service-orders/${order.id}/messages`} className="rounded-full bg-[#eae7ff] px-2.5 py-1 text-[11px] font-bold text-dena-brand">
              {completedCall.sharedFileCount.toLocaleString("fa-IR")} فایل مشترک
            </Link>}
            {nextAppointment && <span className="rounded-full bg-[#e8f0ff] px-2.5 py-1 text-[11px] font-bold text-[#3b6eea]">
              نوبت بعدی: {nextAppointmentFormatter.format(nextAppointment.scheduledAt)}
            </span>}
          </div>
        </section>

        <Link href="/student/growth" className="flex h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-6 py-3 text-sm font-bold text-white">
          شروع مسیر
        </Link>
      </div>
    </StudentShell>;
  }

  return <StudentShell active="services" title="جزئیات مشاوره" mobileNav="service" mobileServiceActive="orders">
    <div className="mx-auto w-full max-w-[520px] space-y-3 md:max-w-3xl md:space-y-5">
      <Card className="space-y-4 p-4 md:space-y-5 md:p-6">
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-[10px] font-bold ${order.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-dena-lavender text-dena-brand"}`}>
          {orderStatusLabel[order.status] ?? "وضعیت نامشخص"}
        </span>
        <div>
          <h2 className="text-base font-extrabold leading-7 text-dena-deep md:text-xl">{order.title}</h2>
          <p className="mt-1 text-[11px] font-semibold text-dena-muted">{order.instituteName}</p>
        </div>

        <div className="rounded-2xl border-r-[3px] border-dena-brand bg-dena-lavender p-3.5">
          <p className="text-xs font-extrabold text-dena-brand">مشاور مؤسسه</p>
          <p className="mt-1 text-[10px] leading-5 text-dena-muted">مشاور و زمان جلسه بر اساس هماهنگی مؤسسه نمایش داده می‌شود.</p>
        </div>

        <div id="appointment-status" className="space-y-3">
          {order.calls.length > 0 ? order.calls.map((call) => <div key={call.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-dena-bg px-3 py-1 text-[10px] font-bold text-dena-deep">
                {call.noShowAt ? "عدم حضور ثبت‌شده" : callStatusLabel[call.status]}
              </span>
              <span className="text-[10px] leading-5 text-dena-muted">{dateFormatter.format(call.scheduledAt)}</span>
            </div>
            {call.status === "ended" && <p className="text-xs text-dena-muted">
              مدت جلسه: <strong className="text-dena-deep">{formatServiceDuration(call.connectedSeconds)}</strong>
            </p>}
            {call.status === "cancelled" && <p className={`rounded-xl p-3 text-[11px] leading-6 ${call.noShowAt ? "bg-amber-50 text-amber-950" : "bg-rose-50 text-rose-800"}`}>
              {call.noShowAt ? "عدم حضور برای این نوبت به‌صورت دستی ثبت شده است؛ این ثبت به‌تنهایی سهمیه یا بازپرداخت را تغییر نمی‌دهد." : "این نوبت لغو شده است. وضعیت درخواست را در صفحهٔ خدمات من ببین."}
            </p>}
          </div>) : <p className="rounded-xl bg-dena-bg p-3 text-[11px] leading-6 text-dena-muted">
            هنوز زمانی برای جلسه ثبت نشده است. پس از هماهنگی مؤسسه، جزئیات نوبت اینجا نمایش داده می‌شود.
          </p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-emerald-700">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5">
            {order.status === "paid" ? "پرداخت ثبت‌شده" : orderStatusLabel[order.status] ?? "در انتظار تأیید"}
          </span>
          <span className="rounded-full bg-dena-bg px-3 py-1.5">کد درخواست {order.id.slice(0, 8)}</span>
        </div>

        {nextCall && <Link href={primaryAction}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-4 py-3 text-sm font-extrabold text-white">
          شروع مسیر
        </Link>}
      </Card>

      <div className="flex items-start gap-3 rounded-xl border-r-[3px] border-blue-500 bg-blue-50 p-3.5">
        <span aria-hidden="true" className="mt-0.5 text-blue-600">◈</span>
        <div>
          <p className="text-[11px] font-extrabold text-blue-700">جلسه داخل دناست</p>
          <p className="mt-1 text-[10px] leading-5 text-dena-muted">بدون پیوند خارجی یا برند شخص ثالث.</p>
        </div>
      </div>

      {order.calls.map((call) => call.followUp ? <section key={call.id} aria-label="خلاصه پیگیری جلسه" className="space-y-3 rounded-2xl border border-dena-border bg-white p-4 md:p-5">
        <h3 className="text-sm font-extrabold text-dena-deep">خلاصه پیگیری</h3>
        <p className="text-xs leading-6 text-dena-muted">یادداشت خصوصی مشاور نمایش داده نمی‌شود.</p>
        <p className="whitespace-pre-wrap text-sm leading-7 text-dena-ink">{call.followUp.summary}</p>
        {call.followUp.nextSteps.length > 0 && <ol className="list-decimal space-y-1 pe-5 text-xs leading-6 text-dena-muted">
          {call.followUp.nextSteps.map((step, index) => <li key={`${call.id}-step-${index}`}>{step}</li>)}
        </ol>}
      </section> : null)}

      {order.status === "paid" && <Link href={`/service-orders/${order.id}/messages`}
        className="flex min-h-11 items-center justify-center rounded-xl border border-dena-brand bg-white px-4 py-2 text-xs font-bold text-dena-brand">
        پیام امن و فایل‌های مشترک
      </Link>}
    </div>
  </StudentShell>;
}
