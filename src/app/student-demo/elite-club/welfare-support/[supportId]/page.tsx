import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoSupport = {
  "sample-one": {
    title: "خدمت رفاهی نمونه",
    status: "فعال",
    type: "(تعیین‌شده توسط سیستم)",
    provider: "(تعیین‌شده توسط سیستم)",
    description: "توضیحات این حمایت در صورت تعریف در این بخش نمایش داده می‌شود.",
    conditions: "شرایط استفاده از این حمایت در صورت تعریف در این بخش نمایش داده می‌شود.",
    instructions: "نحوه استفاده از این حمایت در صورت تعریف در این بخش نمایش داده می‌شود.",
  },
} as const;

export default async function StudentWelfareSupportDetailPreviewPage({
  params,
}: {
  params: Promise<{ supportId: string }>;
}) {
  const { supportId } = await params;
  const support = demoSupport[supportId as keyof typeof demoSupport];
  if (!support) notFound();

  const fields = [
    ["نوع حمایت", support.type],
    ["ارائه‌دهنده", support.provider],
    ["توضیحات", support.description],
    ["شرایط استفاده", support.conditions],
    ["نحوه استفاده", support.instructions],
  ];

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="space-y-4">
        <p className="rounded-xl border border-dena-border bg-white px-4 py-3 text-xs leading-6 text-dena-muted">
          پیش‌نمایش فیگما · اطلاعات و وضعیت‌ها نمایشی‌اند؛ چیزی در پروندهٔ واقعی ثبت نمی‌شود.
        </p>

        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-dena-brand">جزئیات حمایت</span>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <Link href="/student/elite-club/welfare-support" className="text-dena-muted hover:text-dena-brand">حمایت رفاهی</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <Link href="/student/elite-club" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
        </nav>

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">نمونه نمایشی</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">{support.status}</span>
          </div>
          <h2 className="text-xl font-extrabold text-dena-ink md:text-[28px]">{support.title}</h2>
        </header>

        <Card className="space-y-4 rounded-[20px] p-5 md:p-6">
          {fields.map(([label, value]) => (
            <div key={label} className="border-b border-dena-border pb-4 text-right last:border-0 last:pb-0">
              <dt className="text-xs text-dena-muted">{label}</dt>
              <dd className="mt-2 text-sm leading-7 text-dena-ink">{value}</dd>
            </div>
          ))}
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs leading-6 text-dena-muted">این نمونه فقط برای بررسی ظاهر است و درخواستی ثبت نمی‌کند.</p>
          <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-xl bg-dena-brand px-5 py-2 text-sm font-bold text-white opacity-60">
            درخواست حمایت
          </button>
        </div>
        <Link href="/student/elite-club/welfare-support" className="inline-flex text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حمایت رفاهی
        </Link>
      </div>
    </StudentShell>
  );
}
