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

function LockIcon() {
  return <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-dena-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>;
}

function maskPhoneNumber(phoneNumber: string | null) {
  if (!phoneNumber) return "ثبت نشده";
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length < 7) return "ثبت نشده";
  return `${digits.slice(0, 4)}${"•".repeat(Math.max(3, digits.length - 7))}${digits.slice(-3)}`;
}

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
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="rounded-[22px] px-5 py-4">
          <h2 className="mb-2 text-sm font-extrabold text-dena-deep">اطلاعات حساب</h2>
          <dl className="divide-y divide-dena-border/80">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-xs text-dena-muted">نام و نام خانوادگی</dt>
              <dd className="text-sm font-bold text-dena-deep">{profile.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-xs text-dena-muted">شماره موبایل</dt>
              <dd className="text-sm font-bold text-dena-deep" dir="ltr">{maskPhoneNumber(profile.phoneNumber)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-xs text-dena-muted">پایه تحصیلی</dt>
              <dd className="text-sm font-bold text-dena-deep">در حساب ثبت نشده</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <dt className="text-xs text-dena-muted">رشته تحصیلی</dt>
              <dd className="text-sm font-bold text-dena-deep">در حساب ثبت نشده</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3 rounded-[22px] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-dena-deep">داده‌های یادگیری خصوصی</h2>
            <LockIcon />
          </div>
          <p className="text-sm font-bold leading-7 text-dena-brand">یادداشت‌های شخصی شما فقط برای خودتان قابل مشاهده‌اند.</p>
          <p className="text-xs leading-6 text-dena-muted">یادداشت‌های شخصی یادگیری شما، مانند نکته‌برداری از ویدیوها، کاملاً خصوصی هستند و هیچ‌کس جز شما به آن‌ها دسترسی ندارد.</p>
          <details className="group border-t border-dena-border pt-3">
            <summary className="cursor-pointer list-none text-sm font-bold text-dena-brand marker:hidden">
              مدیریت یادداشت‌های شخصی
              <span className="mr-2 text-xs font-medium text-dena-muted">({count.toLocaleString("fa-IR")} یادداشت)</span>
            </summary>
            <div className="mt-4">
              <PrivateNotesCleanup initialCount={count} />
            </div>
          </details>
        </Card>

        <Card className="rounded-[22px] p-5">
          <h2 className="text-base font-extrabold text-dena-deep">دسترسی‌ها و حریم خصوصی</h2>
          <p className="mt-3 text-sm leading-7 text-dena-muted">اطلاعات پیشرفت، ارزیابی و مسیر رشد شما بر اساس سطح دسترسی مجاز و ارتباط با بخش‌های مختلف دنا نمایش داده می‌شود. شماره موبایل، اطلاعات احراز هویت و یادداشت‌های شخصی در گزارش‌های مؤسسه، سازمان یا حامی نمایش داده نمی‌شوند.</p>
        </Card>
      </div>
    </StudentShell>
  );
}
