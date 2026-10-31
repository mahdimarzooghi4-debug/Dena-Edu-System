import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const opportunities = [
  {
    id: "sample-one",
    title: "فرصت توسعه کسب‌وکار",
    description: "نمونه نمایشی از یک فرصت حمایتی برای اعضای باشگاه نخبگان.",
    status: "فعال",
    statusClass: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "sample-two",
    title: "حمایت از ایده‌های نوآورانه",
    description: "نمونه نمایشی از حمایت مرتبط با مسیرهای کارآفرینی.",
    status: "به‌زودی",
    statusClass: "bg-amber-50 text-amber-700",
  },
];

export default function StudentBusinessSupportPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="space-y-6">
        <p className="rounded-xl border border-dena-border bg-white px-4 py-3 text-xs leading-6 text-dena-muted">
          پیش‌نمایش فیگما · فرصت‌ها و وضعیت‌ها نمونه نمایشی‌اند و در پروندهٔ واقعی ثبت نمی‌شوند.
        </p>

        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/student-demo/elite-club" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="font-semibold text-dena-brand">حمایت کسب‌وکار</span>
        </nav>

        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink md:text-[28px]">حمایت کسب‌وکار</h2>
          <p className="text-sm leading-7 text-dena-muted">
            فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.
          </p>
        </header>

        <ul className="space-y-4">
          {opportunities.map((opportunity) => (
            <li key={opportunity.id}>
              <Card className="flex min-h-[132px] flex-wrap items-center justify-between gap-5 rounded-[20px] p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  {opportunity.status === "فعال" ? (
                    <Link href={`/student-demo/elite-club/business-support/${opportunity.id}`} className="text-sm font-semibold text-dena-brand hover:underline">
                      مشاهده جزئیات
                    </Link>
                  ) : (
                    <span className="text-sm text-dena-muted">مشاهده جزئیات</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">نمونه نمایشی</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${opportunity.statusClass}`}>{opportunity.status}</span>
                </div>
                <div className="max-w-2xl space-y-2 text-right">
                  <h3 className="font-bold text-dena-ink">{opportunity.title}</h3>
                  <p className="text-sm leading-6 text-dena-muted">{opportunity.description}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <p className="text-center text-xs leading-6 text-dena-muted">
          ثبت درخواست پس از اتصال به فرایند واقعی فرصت‌ها در دسترس قرار می‌گیرد.
        </p>
      </div>
    </StudentShell>
  );
}
