import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoOpportunities = {
  "sample-one": {
    title: "فرصت توسعه کسب‌وکار",
    status: "فعال",
    statusClass: "bg-emerald-50 text-emerald-700",
    fields: [
      ["نوع فرصت", "حمایت کسب‌وکار"],
      ["معرفی", "این محتوای نمونه فقط برای نمایش ساختار صفحه است؛ توضیحات واقعی پس از انتشار فرصت نمایش داده می‌شود."],
      ["شرایط استفاده", "شرایط در داده‌های واقعی فرصت توسط باشگاه تعریف می‌شود."],
      ["مراحل اقدام", "مراحل ثبت درخواست پس از اتصال به فرایند واقعی در این بخش نمایش داده خواهد شد."],
    ],
  },
} as const;

export default async function StudentBusinessSupportDetailPreviewPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const opportunity = demoOpportunities[opportunityId as keyof typeof demoOpportunities];
  if (!opportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="space-y-5">
        <p className="rounded-xl border border-dena-border bg-white px-4 py-3 text-xs leading-6 text-dena-muted">
          پیش‌نمایش فیگما · همهٔ اطلاعات این فرصت نمونه نمایشی‌اند و هیچ درخواست واقعی ثبت نمی‌شود.
        </p>

        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/student-demo/elite-club" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <Link href="/student-demo/elite-club/business-support" className="text-dena-muted hover:text-dena-brand">حمایت کسب‌وکار</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="font-semibold text-dena-brand">جزئیات فرصت</span>
        </nav>

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">نمونه نمایشی</span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${opportunity.statusClass}`}>{opportunity.status}</span>
          </div>
          <h2 className="text-xl font-extrabold text-dena-ink md:text-[28px]">{opportunity.title}</h2>
        </header>

        <Card className="space-y-4 rounded-[20px] p-5 md:p-6">
          {opportunity.fields.map(([label, value]) => (
            <div key={label} className="border-b border-dena-border pb-4 text-right last:border-0 last:pb-0">
              <dt className="text-xs text-dena-muted">{label}</dt>
              <dd className="mt-2 text-sm leading-7 text-dena-ink">{value}</dd>
            </div>
          ))}
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs leading-6 text-dena-muted">فرایند درخواست پس از تعریف فرصت واقعی فعال می‌شود.</p>
          <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-xl bg-dena-brand px-5 py-2 text-sm font-bold text-white opacity-60">
            ثبت درخواست
          </button>
        </div>

        <Link href="/student-demo/elite-club/business-support" className="inline-flex text-sm font-bold text-dena-brand hover:underline">
          بازگشت به فرصت‌های کسب‌وکار
        </Link>
      </div>
    </StudentShell>
  );
}
