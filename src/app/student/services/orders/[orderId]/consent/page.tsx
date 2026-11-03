import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ConsentStatusRefresh } from "../../../../../../components/services/consent-status-refresh";
import { StudentShell } from "../../../../../../components/student/student-shell";
import { Card } from "../../../../../../components/ui/card";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { getStudentServiceOrder } from "../../../../../../server/student/service-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "رضایت سرپرست | دنا", robots: { index: false, follow: false } };

export default async function StudentServiceOrderConsentPage({
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
  if (!order.guardianConsentRequired || order.guardianConsentConfirmedAt) {
    redirect(`/student/services/orders/${order.id}`);
  }
  if (order.status !== "awaiting_guardian_consent") redirect(`/student/services/orders/${order.id}`);

  return <StudentShell active="services" title="رضایت سرپرست" mobileNav="service" mobileServiceActive="orders">
    <div className="mx-auto w-full max-w-[520px] space-y-3 md:max-w-3xl md:space-y-5">
      <Card className="space-y-4 p-4 md:space-y-5 md:p-6">
        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold text-amber-800">
          رضایت سرپرست لازم است
        </span>

        <section aria-labelledby="consent-title" className="space-y-3 rounded-xl border border-dena-border bg-white p-4 text-center shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-6">
          <div className="mx-auto flex size-[52px] items-center justify-center rounded-[26px] bg-amber-100 text-amber-700" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="4" />
              <path d="M2.5 21a6.5 6.5 0 0 1 11.5-4.2M15 19l2 2 4-4" />
            </svg>
          </div>
          <h2 id="consent-title" className="text-base font-extrabold text-dena-deep">در انتظار تأیید مؤسسه</h2>
          <p className="text-[11px] leading-6 text-dena-muted">مؤسسه هنوز دریافت رضایت سرپرست برای «{order.title}» را در دنا ثبت نکرده است.</p>
          <ConsentStatusRefresh />
        </section>

        <div className="flex items-start gap-3 rounded-lg border-r-[3px] border-amber-600 bg-amber-50 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-amber-800">ورود هنوز بسته است</p>
            <p className="mt-1 text-[11px] leading-5 text-dena-deep">پس از ثبت تأیید مؤسسه، امکان ادامهٔ مسیر و ورود به تماس فعال می‌شود.</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 size-[18px] shrink-0 text-amber-700" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </Card>

      <Link href={`/student/services/orders/${order.id}`} className="flex min-h-11 items-center justify-center rounded-xl border border-dena-border bg-white px-4 py-2 text-xs font-bold text-dena-brand">
        بازگشت به جزئیات نوبت
      </Link>
    </div>
  </StudentShell>;
}
