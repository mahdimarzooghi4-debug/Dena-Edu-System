import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
      <div className="space-y-5">
        <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-sm">
          <Link href="/student/elite-club" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="font-semibold text-dena-brand">حمایت کسب‌وکار</span>
        </nav>
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink md:text-[28px]">حمایت کسب‌وکار</h2>
          <p className="text-sm leading-7 text-dena-muted">فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.</p>
        </header>
        <section className="flex min-h-[min(500px,calc(100svh-300px))] flex-col items-center justify-center rounded-[22px] border border-dena-border bg-white px-6 py-10 text-center" aria-labelledby="business-support-empty">
          <div className="grid size-20 place-items-center rounded-full bg-[#f7f6fb] text-[#9ca3af]" aria-hidden="true">
            <svg viewBox="0 0 36 36" className="size-9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 11a2.5 2.5 0 0 1 2.5-2.5h8l3 4h13a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 28V11Z" />
              <path d="M3.5 15h26" />
            </svg>
          </div>
          <h3 id="business-support-empty" className="mt-5 font-extrabold text-dena-ink">
            فعلاً حمایت کسب‌وکاری فعالی وجود ندارد
          </h3>
          <p className="mt-2 max-w-md text-sm leading-7 text-dena-muted">
            فرصت‌ها و حمایت‌های جدید پس از انتشار در این بخش نمایش داده می‌شوند.
          </p>
        </section>
      </div>
    </StudentShell>
  );
}
