import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { ProblemSolvingRequestForm } from "@/components/student/problem-solving-request-form";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentCourseTeamMember } from "@/server/student/course-team";
import { getStudentProblemSolving } from "@/server/student/problem-solving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "درخواست جلسه رفع اشکال | دنا", robots: { index: false, follow: false } };
const base = (courseId: string, memberId: string) =>
  "/student/courses/" + encodeURIComponent(courseId) + "/team/" + encodeURIComponent(memberId);

export default async function ProblemSolvingRequestPage({
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
  const sessionsHref = base(courseId, teamMemberId) + "/problem-solving";

  return <StudentShell active="courses" title="درخواست جلسه رفع اشکال">
    <div className="space-y-6">
      <Link href={sessionsHref} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به جلسات رفع اشکال</Link>
      <Card className="rounded-[22px] p-6 md:p-7">
        <h1 className="text-xl font-extrabold text-dena-deep">درخواست جلسه رفع اشکال</h1>
        <p className="mt-2 text-sm text-dena-muted">{member.courseTitle} · پشتیبان تحصیلی: {member.name}</p>
      </Card>
      <Card className="space-y-5 rounded-[22px] p-5 md:p-7">
        {data.requestsEnabled ? <>
          <div>
            <h2 className="font-bold text-dena-deep">موضوع درخواست</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              موضوع و توضیح کوتاه را بنویس. ثبت درخواست زمان جلسه را قطعی نمی‌کند؛ مؤسسه زمان را پس از بررسی تعیین می‌کند.
            </p>
          </div>
          <ProblemSolvingRequestForm courseId={courseId} teamMemberId={teamMemberId} />
        </> : <div role="status" className="rounded-xl bg-dena-bg p-5 text-sm leading-7 text-dena-muted">
          درخواست جلسه در حال حاضر برای این پشتیبان و این دوره فعال نیست.
        </div>}
      </Card>
      {data.requests.length > 0 && <Card className="space-y-3 rounded-[22px] p-5">
        <h2 className="font-extrabold text-dena-deep">وضعیت درخواست‌های ثبت‌شده</h2>
        <ul className="space-y-2">{data.requests.map((request) => <li key={request.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dena-bg p-4 text-sm">
          <span className="font-bold text-dena-deep">{request.subject}</span>
          <span className="text-dena-muted">{request.status === "submitted" ? "ثبت‌شده" :
            request.status === "under_review" ? "در حال بررسی" :
              request.status === "scheduled" ? "جلسه تعیین شد" : "قابل انجام نیست"}</span>
        </li>)}</ul>
      </Card>}
    </div>
  </StudentShell>;
}
