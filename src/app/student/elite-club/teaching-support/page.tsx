import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "فرصت‌های پشتیبان تحصیلی | باشگاه نخبگان دنا",
  robots: { index: false, follow: false },
};

export default async function StudentTeachingSupportPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="space-y-5">
        <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-sm">
          <Link href="/student/elite-club" className="font-semibold text-dena-brand hover:underline">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="text-dena-muted">حمایت تدریس</span>
        </nav>
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep md:text-[28px]">فرصت‌های پشتیبان تحصیلی</h2>
          <p className="text-sm leading-7 text-dena-muted">فرصت‌های همکاری آموزشی اعضای باشگاه در این بخش نمایش داده می‌شوند.</p>
        </header>
        <Card className="flex min-h-[240px] flex-col items-center justify-center rounded-[22px] px-5 py-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-dena-bg text-dena-muted" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8a2 2 0 0 1 2-2h8l3 4h9a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
              <path d="M10 16h12M10 20h8" />
            </svg>
          </div>
          <h3 className="mt-4 font-extrabold text-dena-deep">در حال حاضر فرصتی برای نمایش نیست</h3>
          <p className="mt-2 max-w-lg text-sm leading-7 text-dena-muted">
            فرصت‌های پشتیبان تحصیلی هنوز به حساب دانش‌آموز متصل نشده‌اند. پس از انتشار فرصت فعال، جزئیات و امکان اعلام علاقه‌مندی در همین صفحه قرار می‌گیرد.
          </p>
          <Link href="/student/elite-club" className="mt-5 rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-brand hover:bg-dena-bg">
            بازگشت به باشگاه نخبگان
          </Link>
        </Card>
      </div>
    </StudentShell>
  );
}
