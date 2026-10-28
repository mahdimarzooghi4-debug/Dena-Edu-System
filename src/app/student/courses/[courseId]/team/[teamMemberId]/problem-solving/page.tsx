import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentCourseTeamMember } from "@/server/student/course-team";
import { getStudentProblemSolving } from "@/server/student/problem-solving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جلسات رفع اشکال | دنا", robots: { index: false, follow: false } };

const sessionStatus: Record<string, string> = {
  scheduled: "برنامه‌ریزی‌شده",
  held: "برگزارشده",
  cancelled: "لغوشده",
};
const requestStatus: Record<string, string> = {
  submitted: "ثبت‌شده",
  under_review: "در حال بررسی",
  scheduled: "جلسه تعیین شد",
  declined: "قابل انجام نیست",
};
const dateTime = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);
const base = (courseId: string, memberId: string) =>
  "/student/courses/" + encodeURIComponent(courseId) + "/team/" + encodeURIComponent(memberId);

export default async function ProblemSolvingSessionsPage({
  params,
}: { params: Promise<{ courseId: string; teamMemberId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "student")) notFound();

  const { courseId, teamMemberId } = await params;
  if (!z.uuid().safeParse(courseId).success || !z.uuid().safeParse(teamMemberId).success) notFound();
  const [member, data] = await Promise.all([
    getStudentCourseTeamMember(actor.userId, courseId, teamMemberId),
    getStudentProblemSolving(actor.userId, courseId, teamMemberId),
  ]);
  if (!member || member.role !== "academic_supporter" || !data) notFound();

  return <StudentShell active="courses" title="جلسات رفع اشکال">
    <div className="space-y-6">
      <Link href={base(courseId, teamMemberId)} className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به پشتیبان تحصیلی
      </Link>
      <Card className="rounded-[22px] p-6 md:p-7">
        <h1 className="text-xl font-extrabold text-dena-deep">جلسات رفع اشکال {member.courseTitle}</h1>
        <p className="mt-2 text-sm text-dena-muted">پشتیبان تحصیلی: {member.name}</p>
      </Card>

      <Card className="space-y-4 rounded-[22px] p-5 md:p-6">
        <h2 className="text-lg font-extrabold text-dena-deep">جلسات</h2>
        {data.sessions.length === 0 ? (
          <div className="rounded-xl bg-dena-bg p-5 text-sm leading-7 text-dena-muted">
            <p className="font-bold text-dena-deep">هنوز جلسه‌ای برای شما تعیین نشده است.</p>
            <p className="mt-1">پس از بررسی درخواست، زمان جلسه در این فهرست نمایش داده می‌شود.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dena-border bg-dena-bg p-4">
                <div>
                  <h3 className="font-bold text-dena-deep">{session.subject}</h3>
                  <time className="mt-1 block text-xs text-dena-muted" dateTime={session.scheduledAt.toISOString()}>
                    {dateTime(session.scheduledAt)}
                  </time>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-dena-deep">{sessionStatus[session.status]}</span>
                  <Link href={base(courseId, teamMemberId) + "/problem-solving/sessions/" + encodeURIComponent(session.id)}
                    className="rounded-xl border border-dena-brand bg-white px-4 py-2 text-sm font-bold text-dena-brand hover:bg-dena-lavender">
                    مشاهده
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4 rounded-[22px] p-5 md:p-6">
        <h2 className="text-lg font-extrabold text-dena-deep">وضعیت درخواست‌ها</h2>
        {data.requests.length === 0 ? (
          <p className="text-sm leading-7 text-dena-muted">درخواستی برای رفع اشکال ثبت نکرده‌اید.</p>
        ) : <ul className="space-y-3">
          {data.requests.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dena-border p-4">
            <div><p className="font-bold text-dena-deep">{request.subject}</p>
              <time className="mt-1 block text-xs text-dena-muted" dateTime={request.createdAt.toISOString()}>{dateTime(request.createdAt)}</time></div>
            <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">{requestStatus[request.status]}</span>
          </li>)}
        </ul>}
        {data.requestsEnabled ? (
          <Link href={base(courseId, teamMemberId) + "/problem-solving/request"}
            className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-5 text-sm font-bold text-white hover:bg-dena-deep">
            درخواست جلسه رفع اشکال
          </Link>
        ) : (
          <p className="rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
            درخواست جلسه در حال حاضر برای این پشتیبان و این دوره فعال نیست.
          </p>
        )}
      </Card>
    </div>
  </StudentShell>;
}
