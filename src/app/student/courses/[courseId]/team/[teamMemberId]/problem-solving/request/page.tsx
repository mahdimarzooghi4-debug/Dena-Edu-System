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
    <div className="-mt-1 mx-auto max-w-2xl space-y-4 md:mt-0 md:space-y-5">
      <Link href={sessionsHref} className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex">بازگشت به جلسات رفع اشکال</Link>
      <Card className="flex h-[78px] flex-col items-start justify-center rounded-[16px] px-4 text-right md:h-auto md:rounded-[22px] md:px-6 md:py-5">
        <h1 className="text-[18px] font-bold leading-7 text-dena-deep">درخواست جلسه رفع اشکال</h1>
        <p className="text-[12px] leading-5 text-dena-muted">{member.courseTitle}</p>
      </Card>

      <Card className="h-[470px] rounded-[16px] p-[15px] md:h-auto md:rounded-[22px] md:p-6">
        {data.requestsEnabled ? <ProblemSolvingRequestForm courseId={courseId} teamMemberId={teamMemberId} /> : (
          <div role="status" className="rounded-xl bg-dena-bg p-5 text-sm leading-7 text-dena-muted">
            درخواست جلسه در حال حاضر برای این پشتیبان و این دوره فعال نیست.
          </div>
        )}
      </Card>
    </div>
  </StudentShell>;
}
