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
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tehran",
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

  return (
    <StudentShell active="courses" title="جلسات رفع اشکال">
      <div className="mx-auto max-w-2xl space-y-3 md:space-y-5">
        <Link href={base(courseId, teamMemberId)} className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex">
          بازگشت به پشتیبان تحصیلی
        </Link>

        <Card className="rounded-[22px] px-5 py-3.5">
          <h1 className="text-lg font-extrabold text-dena-deep">جلسات رفع اشکال</h1>
          <p className="mt-1 text-sm text-dena-muted">{member.courseTitle} — {member.name}</p>
        </Card>

        <Card className="rounded-[22px] p-3.5 sm:p-5">
          {data.sessions.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl bg-dena-bg px-4 py-6 text-center">
              <p className="text-sm font-bold leading-7 text-dena-deep">جلسه‌ی رفع اشکالی برای شما ثبت نشده است.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.sessions.map((session) => {
                const statusClass = session.status === "scheduled"
                  ? "bg-amber-100 text-amber-800"
                  : session.status === "held"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-dena-lavender text-dena-brand";
                return (
                  <li key={session.id}>
                    <Link
                      href={base(courseId, teamMemberId) + "/problem-solving/sessions/" + encodeURIComponent(session.id)}
                      className="block rounded-2xl border border-dena-border bg-dena-bg p-3 transition-colors hover:border-dena-brand/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-bold leading-6 text-dena-deep">{session.subject}</span>
                        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusClass}`}>{sessionStatus[session.status]}</span>
                      </div>
                      <time className="mt-2 block text-xs text-dena-muted" dateTime={session.scheduledAt.toISOString()}>
                        {dateTime(session.scheduledAt)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {data.requestsEnabled ? (
            <Link href={base(courseId, teamMemberId) + "/problem-solving/request"}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-dena-brand px-5 text-sm font-bold text-white hover:bg-dena-deep">
              درخواست جلسه رفع اشکال
            </Link>
          ) : (
            <p className="mt-4 rounded-xl bg-dena-bg p-3 text-center text-xs leading-6 text-dena-muted">
              درخواست جلسه در حال حاضر برای این پشتیبان و این دوره فعال نیست.
            </p>
          )}

          {data.requests.length > 0 && (
            <details className="mt-4 border-t border-dena-border pt-3">
              <summary className="cursor-pointer text-sm font-bold text-dena-brand">
                وضعیت درخواست‌های شما ({data.requests.length.toLocaleString("fa-IR")})
              </summary>
              <ul className="mt-3 space-y-2">
                {data.requests.map((request) => (
                  <li key={request.id} className="rounded-xl border border-dena-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-dena-deep">{request.subject}</span>
                      <span className="shrink-0 rounded-full bg-dena-lavender px-2.5 py-1 text-[11px] font-bold text-dena-brand">{requestStatus[request.status]}</span>
                    </div>
                    <time className="mt-2 block text-xs text-dena-muted" dateTime={request.createdAt.toISOString()}>{dateTime(request.createdAt)}</time>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </div>
    </StudentShell>
  );
}
