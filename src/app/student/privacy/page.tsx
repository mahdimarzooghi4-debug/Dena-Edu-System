import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { PrivateNotesCleanup } from "../../../components/student/private-notes-cleanup";
import { StudentShell } from "../../../components/student/student-shell";
import { getServerAccessContext } from "../../../server/access/actor";
import { countStudentVideoNotes } from "../../../server/student/note-privacy";
import { getStudentProfile } from "../../../server/student/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حریم خصوصی و داده‌ها | دنا", robots: { index: false, follow: false } };

export default async function StudentPrivateNotesPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const [count, profile] = await Promise.all([
    countStudentVideoNotes(actor.userId),
    getStudentProfile(actor.userId),
  ]);
  if (!profile) notFound();

  return (
    <StudentShell active="account" title="حریم خصوصی و داده‌ها">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">حریم خصوصی و داده‌ها</p>
          <h1 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">داده‌های یادگیری خصوصی</h1>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">یادداشت‌های شخصی تو فقط برای خودت قابل مشاهده‌اند. اطلاعات پیشرفت و ارزیابی بر اساس سطح دسترسی مجاز و ارتباط با بخش‌های مختلف دنا نمایش داده می‌شود.</p>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-[22px] p-6 md:p-7">
            <h2 className="text-lg font-extrabold text-dena-deep">دسترسی‌ها و حریم خصوصی</h2>
            <p className="mt-3 text-sm leading-8 text-dena-muted">شماره موبایل، اطلاعات احراز هویت و یادداشت‌های شخصی در گزارش‌های مؤسسه، سازمان یا خیر نمایش داده نمی‌شوند. دسترسی به اطلاعات یادگیری فقط مطابق مجوزهای ثبت‌شده در سامانه انجام می‌شود.</p>
          </Card>
          <Card className="rounded-[22px] p-6 md:p-7">
            <h2 className="text-lg font-extrabold text-dena-deep">اطلاعات حساب</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-dena-bg p-4"><dt className="text-xs text-dena-muted">نام و نام خانوادگی</dt><dd className="mt-1 font-bold text-dena-deep">{profile.name}</dd></div>
              <div className="rounded-xl bg-dena-bg p-4"><dt className="text-xs text-dena-muted">شماره موبایل</dt><dd className="mt-1 font-bold text-dena-deep" dir="ltr">{profile.phoneNumber || "ثبت نشده"}</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-6 text-dena-muted">اطلاعات پایه و رشته در این حساب ثبت نشده است.</p>
          </Card>
        </div>

        <Card className="rounded-[22px] p-6 md:p-7">
          <h2 className="mb-2 text-lg font-extrabold text-dena-deep">یادداشت‌های شخصی یادگیری</h2>
          <p className="mb-5 text-sm leading-7 text-dena-muted">یادداشت‌هایی که هنگام یادگیری ذخیره کرده‌ای فقط برای خودت هستند. یادداشت‌های دوره‌های غیرقابل‌دسترس اینجا نمایش داده نمی‌شوند.</p>
          <PrivateNotesCleanup initialCount={count} />
        </Card>
      </div>
    </StudentShell>
  );
}
