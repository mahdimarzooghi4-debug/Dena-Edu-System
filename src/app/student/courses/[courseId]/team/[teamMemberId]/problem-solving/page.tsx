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
const dateTime = (value: Date, includeTime: boolean) => new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  ...(includeTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  timeZone: "Asia/Tehran",
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
      <div className="mx-auto max-w-2xl space-y-4 md:space-y-5">
        <Link href={base(courseId, teamMemberId)} className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex">
          بازگشت به پشتیبان تحصیلی
        </Link>

        <Card className="flex h-[78px] flex-col justify-center rounded-[16px] px-4 text-right md:h-auto md:rounded-[22px] md:px-5 md:py-3.5">
          <h1 className="text-[18px] font-extrabold leading-7 text-dena-deep">جلسات رفع اشکال</h1>
          <p className="text-[12px] leading-5 text-dena-muted">{member.courseTitle} — {member.name}</p>
        </Card>

        <Card className="h-[360px] overflow-y-auto rounded-[16px] p-[11px] md:h-auto md:overflow-visible md:rounded-[22px] md:p-5">
          {data.sessions.length === 0 ? (
            <div aria-hidden="true" className="h-0" />
          ) : (
            <ul className="space-y-3">
              {data.sessions.map((session) => {
                const statusClass = session.status === "scheduled"
                  ? "h-7 w-[112px] bg-[#fff7d6] text-[#b47800]"
                  : session.status === "held"
                    ? "h-7 w-[96px] bg-[#e0f8ef] text-[#2f8f6a]"
                    : "h-7 w-[96px] bg-[#ede9fe] text-[#5b4ce2]";
                return (
                  <li key={session.id}>
                    <Link
                      href={base(courseId, teamMemberId) + "/problem-solving/sessions/" + encodeURIComponent(session.id)}
                      className="flex h-[72px] items-center justify-between gap-3 rounded-[12px] border border-dena-border bg-dena-bg px-3 md:h-auto md:rounded-2xl md:p-3"
                    >
                      <div className="min-w-0 flex-1 text-right">
                        <span className="block truncate text-[14px] font-bold leading-6 text-dena-deep">{session.subject}</span>
                        <time
                          className="mt-0.5 block text-[11px] leading-[18px] text-dena-muted"
                          dateTime={session.scheduledAt.toISOString()}
                        >
                          {dateTime(session.scheduledAt, session.status === "scheduled")}
                        </time>
                      </div>
                      <span className={"flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold " + statusClass}>
                        {sessionStatus[session.status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {data.requestsEnabled ? (
            <Link
              href={base(courseId, teamMemberId) + "/problem-solving/request"}
              className="mx-1 mt-[26px] inline-flex h-[42px] min-h-[42px] w-[calc(100%-0.5rem)] items-center justify-center rounded-full bg-dena-brand px-5 text-[13px] font-bold text-white hover:bg-dena-deep md:mx-0 md:mt-4 md:h-auto md:min-h-11 md:w-full md:text-sm"
            >
              درخواست جلسه رفع اشکال
            </Link>
          ) : (
            <p className="mx-1 mt-[26px] rounded-xl bg-dena-bg p-3 text-center text-xs leading-6 text-dena-muted md:mx-0 md:mt-4">
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
                    <time className="mt-2 block text-xs text-dena-muted" dateTime={request.createdAt.toISOString()}>{dateTime(request.createdAt, true)}</time>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        {data.sessions.length === 0 && (
          <Card className="flex h-[100px] items-center rounded-[16px] px-4 text-right md:h-auto md:rounded-[22px] md:p-5">
            <p className="text-[13px] font-bold leading-[26px] text-dena-deep">
              جلسه‌ی رفع اشکالی برای شما ثبت نشده است.
            </p>
          </Card>
        )}
      </div>
    </StudentShell>
  );
}
