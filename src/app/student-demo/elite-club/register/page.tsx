import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default function EliteClubRegistrationIntroPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col gap-6">
        <header className="space-y-3 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink">ثبت‌نام در باشگاه نخبگان</h2>
          <p className="text-sm leading-7 text-dena-muted">
            باشگاه نخبگان دنا فضایی برای رشد استعدادها، ارتباط و هم‌افزایی و شکل‌گیری فرصت‌های تازه است.
          </p>
        </header>

        <Card className="flex flex-col gap-6 rounded-2xl border border-dena-border p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-start gap-3" dir="rtl">
            <Link
              href="/student-demo"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-dena-border px-6 text-sm font-medium text-dena-ink hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
            >
              انصراف
            </Link>
            <Link
              href="/student-demo/elite-club/register/confirmation"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-dena-brand px-6 text-sm font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
            >
              ثبت‌نام و ادامه
            </Link>
          </div>

          <section className="rounded-xl bg-[#f7f6fb] p-4 text-right" aria-labelledby="registration-precheck-title">
            <h3 id="registration-precheck-title" className="mb-2 text-base font-bold text-dena-ink">پیش از ثبت‌نام</h3>
            <p className="text-sm leading-7 text-dena-muted">
              ثبت‌نام، آغاز فرایند ارزیابی عضویت در باشگاه است. لطفاً برای پاسخ به سؤالات ارزیابی صبور و دقیق باشید.
            </p>
          </section>

          <p className="text-xs leading-6 text-dena-muted">
            این صفحه پیش‌نمایش نمایشی است؛ ادامهٔ مسیر، ثبت‌نام واقعی یا تغییر وضعیت عضویت انجام نمی‌دهد.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
