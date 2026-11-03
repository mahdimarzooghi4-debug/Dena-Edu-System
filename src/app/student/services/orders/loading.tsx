import { StudentShell } from "../../../../components/student/student-shell";

export default function StudentServiceOrdersLoading() {
  return <StudentShell active="services" title="درخواست‌های خدمات من">
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="rounded-[22px] bg-dena-lavender p-6 md:p-8">
        <div className="h-4 w-32 animate-pulse rounded bg-white/80" />
        <div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded bg-white/80" />
        <span className="sr-only">اطلاعات نوبت دریافت می‌شود…</span>
      </div>
      {[0, 1].map((item) => <div key={item} className="space-y-4 rounded-2xl border border-dena-border bg-white p-5">
        <div className="h-5 w-44 animate-pulse rounded bg-dena-bg" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-16 animate-pulse rounded-xl bg-dena-bg" />
          <div className="h-16 animate-pulse rounded-xl bg-dena-bg" />
        </div>
      </div>)}
    </div>
  </StudentShell>;
}
