import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const items = [
  { id: "sample-one", title: "خدمت رفاهی نمونه", status: "فعال", statusClass: "bg-emerald-50 text-emerald-600" },
  { id: "sample-two", title: "خدمت رفاهی نمونه ۲", status: "به‌زودی", statusClass: "bg-amber-50 text-amber-700" },
];

export default function StudentWelfareSupportPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="space-y-6">
        <p className="rounded-xl border border-dena-border bg-white px-4 py-3 text-xs leading-6 text-dena-muted">
          پیش‌نمایش فیگما · اطلاعات و وضعیت‌ها نمایشی‌اند؛ چیزی در پروندهٔ واقعی ثبت نمی‌شود.
        </p>

        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-dena-brand">حمایت رفاهی</span>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <Link href="/student/elite-club" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
        </nav>

        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink md:text-[28px]">حمایت رفاهی</h2>
          <p className="text-sm leading-7 text-dena-muted">خدمات و حمایت‌های رفاهی تعریف‌شده برای اعضای باشگاه.</p>
        </header>

        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex min-h-[110px] flex-wrap items-center justify-between gap-5 rounded-[20px] p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  {item.status === "فعال" ? (
                    <Link href={`/student/elite-club/welfare-support/${item.id}`} className="text-sm font-semibold text-dena-brand hover:underline">مشاهده جزئیات</Link>
                  ) : (
                    <span className="text-sm text-dena-muted">مشاهده جزئیات</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">نمونه نمایشی</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.statusClass}`}>{item.status}</span>
                </div>
                <div className="space-y-2 text-right">
                  <h3 className="font-bold text-dena-ink">{item.title}</h3>
                  <p className="text-xs text-dena-muted">نوع: (تعیین‌شده توسط سیستم)</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <p className="text-center text-xs leading-6 text-dena-muted">
          حمایت‌های رفاهی جدید باشگاه پس از انتشار در این بخش نمایش داده می‌شوند.
        </p>
      </div>
    </StudentShell>
  );
}
