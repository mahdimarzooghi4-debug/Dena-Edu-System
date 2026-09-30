import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrivateNotesCleanup } from "../../../components/student/private-notes-cleanup";
import { StudentShell } from "../../../components/student/student-shell";
import { getServerAccessContext } from "../../../server/access/actor";
import { countStudentVideoNotes } from "../../../server/student/note-privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مدیریت یادداشت‌های شخصی | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentPrivateNotesPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const count = await countStudentVideoNotes(actor.userId);

  return (
    <StudentShell active="account" title="حریم خصوصی و داده">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">داده‌های شخصی من</p>
          <h2 className="mt-2 text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[30px]">
            مدیریت یادداشت‌های شخصی
          </h2>
          <p className="mt-2 text-sm leading-8 text-dena-muted">
            یادداشت‌هایی که خودت ذخیره کرده‌ای متعلق به حساب تو هستند.
            متن یادداشت‌های دوره‌های غیرقابل‌دسترس در این صفحه نمایش داده نمی‌شود
            و این داده‌ها وارد گزارش مؤسسه، سازمان یا خیر نمی‌شوند.
          </p>
        </section>
        <PrivateNotesCleanup initialCount={count} />
      </div>
    </StudentShell>
  );
}
