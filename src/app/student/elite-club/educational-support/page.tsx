import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "حمایت آموزشی | باشگاه نخبگان دنا",
  robots: { index: false, follow: false },
};

export default async function StudentEducationalSupportPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="flex min-h-[calc(100svh-220px)] items-center justify-center py-8 lg:min-h-[calc(100vh-220px)]">
        <section className="mx-auto flex max-w-xl flex-col items-center px-4 text-center" aria-labelledby="educational-support-empty">
          <div className="grid size-20 place-items-center rounded-full bg-[#e9e6fb] text-[#5b4ce2]" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 3 11 6.2v13.6L16 29 5 22.8V9.2L16 3Z" />
              <path d="m5.5 9.5 10.5 6 10.5-6M16 16v12.5" />
            </svg>
          </div>
          <h2 id="educational-support-empty" className="mt-6 text-lg font-extrabold text-[#2b2544]">
            فعلاً آموزش غیردرسی فعالی وجود ندارد
          </h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-dena-muted">
            آموزش‌های جدید باشگاه پس از انتشار در این بخش نمایش داده می‌شوند.
          </p>
        </section>
      </div>
    </StudentShell>
  );
}
