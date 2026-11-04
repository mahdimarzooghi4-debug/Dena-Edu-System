import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ثبت‌نام در باشگاه نخبگان | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentEliteClubRegistrationPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="mx-auto max-w-2xl space-y-5">
        <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-sm">
          <Link href="/student/elite-club" className="font-semibold text-dena-brand hover:underline">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="text-dena-muted">ثبت‌نام</span>
        </nav>
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep md:text-[28px]">ثبت‌نام در باشگاه نخبگان</h2>
          <p className="text-sm leading-7 text-dena-muted">
            باشگاه نخبگان دانا فضایی برای رشد استعدادها، ارتباط و هم‌افزایی و شکل‌گیری فرصت‌های تازه است.
          </p>
        </header>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Link href="/student/elite-club" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-dena-border bg-white px-5 text-sm font-bold text-dena-muted hover:bg-dena-bg">
            انصراف
          </Link>
          <button type="button" disabled aria-describedby="registration-status" className="min-h-12 flex-1 cursor-not-allowed rounded-xl bg-dena-brand px-5 text-sm font-bold text-white opacity-60">
            ثبت‌نام و ادامه
          </button>
        </div>
        <Card className="rounded-[20px] p-5 text-right">
          <h3 className="font-extrabold text-dena-deep">پیش از ثبت‌نام</h3>
          <p className="mt-2 text-sm leading-7 text-dena-muted">
            ثبت‌نام، آغاز فرایند ارزیابی عضویت در باشگاه است. لطفاً برای پاسخ به سؤال‌های ارزیابی آماده باشید.
          </p>
        </Card>
        <p className="text-center text-sm text-dena-muted">
          <Link href="/student/elite-club/evaluation" className="font-bold text-dena-brand hover:underline">پیش‌نمایش صفحهٔ ارزیابی</Link>
        </p>
        <p id="registration-status" role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
          اتصال ثبت‌نام باشگاه به سامانه هنوز فعال نشده است؛ برای جلوگیری از ثبت‌نام غیرواقعی، ادامهٔ فرم فعلاً غیرفعال است.
        </p>
      </div>
    </StudentShell>
  );
}
