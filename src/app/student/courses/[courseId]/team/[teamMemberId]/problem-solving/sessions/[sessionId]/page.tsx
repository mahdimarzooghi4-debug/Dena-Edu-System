import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentProblemSolvingSession } from "@/server/student/problem-solving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات جلسه رفع اشکال | دنا", robots: { index: false, follow: false } };

const labels = { scheduled: "برنامه‌ریزی‌شده", held: "برگزارشده", cancelled: "لغوشده" } as const;
const dateTime = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);
const base = (courseId: string, memberId: string) =>
  "/student/courses/" + encodeURIComponent(courseId) + "/team/" + encodeURIComponent(memberId);

export default async function ProblemSolvingSessionDetailsPage({
  params,
}: { params: Promise<{ courseId: string; teamMemberId: string; sessionId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "student")) notFound();

  const { courseId, teamMemberId, sessionId } = await params;
  if (![courseId, teamMemberId, sessionId].every((id) => z.uuid().safeParse(id).success)) notFound();
  const session = await getStudentProblemSolvingSession(actor.userId, courseId, teamMemberId, sessionId);
  if (!session) notFound();
  const listHref = base(courseId, teamMemberId) + "/problem-solving";

  return <StudentShell active="courses" title="جزئیات جلسه رفع اشکال">
    <div className="space-y-6">
      <Link href={listHref} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به جلسات رفع اشکال</Link>
      <Card className="rounded-[22px] p-6 md:p-7">
        <p className="text-sm font-bold text-dena-brand">{session.courseTitle}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">{session.subject}</h1>
      </Card>
      <Card className="space-y-5 rounded-[22px] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold text-dena-deep">اطلاعات جلسه</h2>
          <span className="rounded-full bg-dena-lavender px-4 py-2 text-xs font-bold text-dena-brand">{labels[session.status]}</span>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-dena-bg p-4"><dt className="text-xs text-dena-muted">پشتیبان تحصیلی</dt><dd className="mt-2 font-bold text-dena-deep">{session.supporterName}</dd></div>
          <div className="rounded-xl bg-dena-bg p-4"><dt className="text-xs text-dena-muted">دوره</dt><dd className="mt-2 font-bold text-dena-deep">{session.courseTitle}</dd></div>
          <div className="rounded-xl bg-dena-bg p-4"><dt className="text-xs text-dena-muted">تاریخ و ساعت</dt>
            <dd className="mt-2 font-bold text-dena-deep"><time dateTime={session.scheduledAt.toISOString()}>{dateTime(session.scheduledAt)}</time></dd></div>
        </dl>
        <div className="rounded-xl bg-dena-bg p-4">
          <h3 className="font-bold text-dena-deep">جزئیات عملیاتی جلسه</h3>
          <p className="mt-2 text-sm leading-7 text-dena-muted">
            اطلاعات اجرایی جلسه فقط در صورتی نمایش داده می‌شود که مؤسسهٔ مسئول آن را ثبت کرده باشد.
          </p>
        </div>
      </Card>
    </div>
  </StudentShell>;
}
