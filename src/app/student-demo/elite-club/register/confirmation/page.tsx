import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default function EliteClubRegistrationConfirmationPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col justify-center gap-6">
        <Card className="flex flex-col items-center gap-5 rounded-2xl border border-dena-border p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-[#f7f6fb] text-dena-brand">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="size-9" fill="none">
              <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="m13.5 20.5 4.5 4.5 9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-dena-ink">ثبت‌نام انجام شد</h2>
            <p className="text-sm leading-7 text-dena-muted">اکنون می‌توانی فرایند ارزیابی باشگاه را ادامه دهی.</p>
          </div>
          <Link
            href="/student-demo/elite-club/register/evaluation"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-dena-brand px-7 text-sm font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
          >
            شروع ارزیابی
          </Link>
          <p className="text-xs leading-6 text-dena-muted">این صفحه پیش‌نمایش است؛ عضویت یا اطلاعات واقعی ثبت نمی‌شود.</p>
        </Card>
      </div>
    </StudentShell>
  );
}
