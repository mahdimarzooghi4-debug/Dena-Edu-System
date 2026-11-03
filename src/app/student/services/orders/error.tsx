"use client";

import Link from "next/link";
import { StudentShell } from "../../../../components/student/student-shell";

export default function StudentServiceOrdersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StudentShell active="services" title="درخواست‌های خدمات من">
    <section role="alert" className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
      <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-rose-50 text-xl font-bold text-rose-700">×</span>
      <h2 className="mt-4 text-lg font-extrabold text-dena-deep">دریافت اطلاعات نوبت انجام نشد</h2>
      <p className="mt-2 text-sm leading-7 text-dena-muted">ارتباط با سامانه برقرار نشد. دوباره تلاش کن یا به مرکز خدمات برگرد.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-dena-brand px-4 py-2 text-sm font-bold text-white">تلاش دوباره</button>
        <Link href="/student/services" className="inline-flex min-h-11 items-center rounded-xl border border-dena-brand px-4 py-2 text-sm font-bold text-dena-brand">مرکز خدمات</Link>
      </div>
    </section>
  </StudentShell>;
}
