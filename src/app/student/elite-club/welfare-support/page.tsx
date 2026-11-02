import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "حمایت رفاهی | باشگاه نخبگان دنا",
  robots: { index: false, follow: false },
};

export default async function StudentWelfareSupportPage() {
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
          <span className="text-dena-muted">حمایت رفاهی</span>
        </nav>
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep md:text-[28px]">حمایت رفاهی</h2>
          <p className="text-sm leading-7 text-dena-muted">خدمات و حمایت‌های رفاهی تعریف‌شده برای اعضای باشگاه.</p>
        </header>
        <Card className="flex min-h-[205px] flex-col items-center justify-center rounded-[22px] px-5 py-7 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[#f4f4f6] text-[#8a8994]" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8a2 2 0 0 1 2-2h8l3 4h9a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
            </svg>
          </div>
          <h3 className="mt-5 font-extrabold text-dena-ink">حمایتی تعریف نشده است</h3>
          <p className="mt-2 text-sm leading-7 text-dena-muted">در حال حاضر حمایت رفاهی فعالی وجود ندارد.</p>
        </Card>
      </div>
    </StudentShell>
  );
}
