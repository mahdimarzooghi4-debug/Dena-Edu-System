import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "حمایت کسب‌وکار | باشگاه نخبگان دنا",
  robots: { index: false, follow: false },
};

export default async function StudentBusinessSupportPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="space-y-6">
        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/student/elite-club" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="font-semibold text-dena-brand">حمایت کسب‌وکار</span>
        </nav>

        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink md:text-[28px]">حمایت کسب‌وکار</h2>
          <p className="text-sm leading-7 text-dena-muted">
            فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.
          </p>
        </header>

        <Card className="rounded-[20px] border-dena-border p-6 text-center md:p-8">
          <h3 className="font-extrabold text-dena-ink">فعلاً فرصت کسب‌وکاری برای نمایش منتشر نشده است</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-dena-muted">
            فرصت‌های تازهٔ باشگاه پس از انتشار در این بخش نمایش داده می‌شوند. در حال حاضر موردی از سامانه برای حساب تو ثبت نشده است.
          </p>
          <Link href="/student/elite-club" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-dena-brand bg-white px-4 py-2 text-sm font-bold text-dena-brand hover:bg-dena-lavender">
            بازگشت به باشگاه نخبگان
          </Link>
        </Card>
      </div>
    </StudentShell>
  );
}
