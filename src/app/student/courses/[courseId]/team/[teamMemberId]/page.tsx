import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentCourseTeamMember } from "@/server/student/course-team";
import { getStudentProblemSolving } from "@/server/student/problem-solving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "عضو تیم آموزشی | دنا",
  robots: { index: false, follow: false },
};

function roleLabel(role: "teacher" | "academic_supporter" | "counselor") {
  if (role === "teacher") return "مدرس";
  if (role === "academic_supporter") return "پشتیبان تحصیلی";
  return "مشاور";
}

export default async function CourseTeamMemberPage({
  params,
}: {
  params: Promise<{ courseId: string; teamMemberId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const { courseId, teamMemberId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(teamMemberId).success) notFound();

  const member = await getStudentCourseTeamMember(
    actor.userId, courseId, teamMemberId,
  );
  if (!member) notFound();

  const label = roleLabel(member.role);
  const problemSolving = member.role === "academic_supporter"
    ? await getStudentProblemSolving(actor.userId, courseId, teamMemberId)
    : null;

  const requestStatusLabel = {
    submitted: "ثبت‌شده",
    under_review: "در حال بررسی",
    scheduled: "تعیین جلسه",
    declined: "قابل انجام نیست",
  } as const;
  const sessionStatusLabel = {
    scheduled: "برنامه‌ریزی‌شده",
    held: "برگزارش‌شده",
    cancelled: "لغوشده",
  } as const;

  return (
    <StudentShell active="courses" title={label}>
      <div className="space-y-4">
        <Link
          href={`/student/courses/${courseId}`}
          className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex"
        >
          بازگشت به جزئیات دوره
        </Link>

        {member.role === "academic_supporter" && problemSolving ? (
          <>
            <Card className="rounded-[22px] px-5 py-3.5">
              <h2 className="text-lg font-extrabold text-dena-deep">{label}</h2>
              <p className="mt-1 text-sm text-dena-muted">{member.courseTitle}</p>
            </Card>

            <Card className="space-y-4 rounded-[22px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-dena-deep">{member.name}</h2>
                  <p className="mt-1 text-sm text-dena-muted">پشتیبان آموزشی دورهٔ {member.courseTitle}</p>
                </div>
                <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">{label}</span>
              </div>
              <p className="text-sm leading-7 text-dena-muted">
                ارتباط فقط در چارچوب همین دوره انجام می‌شود و اطلاعات تماس شخصی نمایش داده نمی‌شود.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link href={`/student/courses/${courseId}/team/${teamMemberId}/conversation`}
                  className={`${buttonClassName("outline")} min-h-11`}>گفت‌وگو</Link>
                {problemSolving.requestsEnabled ? (
                  <Link href={`/student/courses/${courseId}/team/${teamMemberId}/problem-solving/request`}
                    className={`${buttonClassName()} min-h-11`}>درخواست رفع اشکال</Link>
                ) : (
                  <span aria-disabled="true" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-dena-bg px-3 text-center text-xs font-bold text-dena-muted">درخواست غیرفعال</span>
                )}
              </div>
            </Card>

            <Card className="rounded-[22px] p-4 sm:p-5">
              <h2 className="mb-4 text-base font-extrabold text-dena-deep">جلسات رفع اشکال</h2>
              {problemSolving.sessions.length === 0 ? (
                <p className="rounded-2xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">هنوز جلسه‌ای برای این دوره ثبت نشده است.</p>
              ) : (
                <ul className="space-y-3">
                  {problemSolving.sessions.map((session) => {
                    const statusClass = session.status === "scheduled"
                      ? "bg-amber-100 text-amber-800"
                      : session.status === "held"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-dena-bg text-dena-muted";
                    return (
                      <li key={session.id}>
                        <Link href={`/student/courses/${courseId}/team/${teamMemberId}/problem-solving/sessions/${session.id}`}
                          className="block rounded-2xl border border-dena-border bg-dena-bg p-3 transition-colors hover:border-dena-brand/50">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-bold leading-6 text-dena-deep">{session.subject}</span>
                            <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusClass}`}>{sessionStatusLabel[session.status]}</span>
                          </div>
                          <time className="mt-2 block text-xs text-dena-muted">
                            {session.scheduledAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "short", timeStyle: "short" })}
                          </time>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {problemSolving.requests.length > 0 && (
                <details className="mt-4 border-t border-dena-border pt-3">
                  <summary className="cursor-pointer text-sm font-bold text-dena-brand">درخواست‌های شما ({problemSolving.requests.length.toLocaleString("fa-IR")})</summary>
                  <ul className="mt-3 space-y-2">
                    {problemSolving.requests.map((request) => (
                      <li key={request.id} className="rounded-xl border border-dena-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-bold text-dena-deep">{request.subject}</span>
                          <span className="shrink-0 rounded-full bg-dena-lavender px-2.5 py-1 text-[11px] font-bold text-dena-brand">{requestStatusLabel[request.status]}</span>
                        </div>
                        <time className="mt-2 block text-xs text-dena-muted">{request.createdAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</time>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          </>
        ) : member.role === "counselor" ? (
          <>
            <Card className="flex h-[78px] flex-col items-start justify-center rounded-[16px] px-4 text-right md:h-auto md:rounded-[22px] md:px-6 md:py-5">
              <h2 className="text-[18px] font-bold leading-7 text-dena-deep">مشاور</h2>
              <p className="text-[12px] leading-5 text-dena-muted">{member.courseTitle}</p>
            </Card>

            <Card className="h-[170px] rounded-[16px] p-[15px] md:h-auto md:rounded-[22px] md:p-6">
              <div className="flex h-7 items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-[18px] font-bold leading-7 text-dena-deep">{member.name}</h2>
                <span className="inline-flex h-7 w-[118px] shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-[11px] font-semibold leading-5 text-dena-brand">مشاور</span>
              </div>
              <p className="mt-1 text-[12px] leading-5 text-dena-muted">{member.courseTitle}</p>
              <p className="mt-2 text-[12px] leading-[18px] text-dena-muted md:mt-4 md:text-sm md:leading-7">
                ارتباط با مشاور فقط در چارچوب همین دوره انجام می‌شود.
              </p>
              <Link
                href={`/student/courses/${courseId}/team/${teamMemberId}/conversation`}
                className={`${buttonClassName("outline")} mt-3 h-9 min-h-9 w-[120px] rounded-full border-dena-brand px-3 py-1 text-[13px] font-bold text-dena-brand md:mt-5`}
              >
                گفت‌وگو
              </Link>
            </Card>
          </>
        ) : (
          <Card className="rounded-[22px] p-6 md:p-8">
            <p className="text-sm font-bold text-dena-brand">{label}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{member.name}</h2>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-dena-bg p-4">
                <dt className="text-xs text-dena-muted">دوره</dt>
                <dd className="mt-2 font-bold">{member.courseTitle}</dd>
              </div>
              <div className="rounded-2xl bg-dena-bg p-4">
                <dt className="text-xs text-dena-muted">نقش در این دوره</dt>
                <dd className="mt-2 font-bold">{label}</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-8 text-dena-muted">
              ارتباط با این عضو فقط در چارچوب همین دوره انجام می‌شود و اطلاعات تماس شخصی او در این بخش نمایش داده نمی‌شود.
            </p>
            {member.role !== "teacher" ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/student/courses/${courseId}/team/${teamMemberId}/conversation`} className={buttonClassName()}>
                  مشاهده گفت‌وگو
                </Link>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
                مسیر ارتباط مستقیم با مدرس در این نسخه تعریف نشده است.
              </p>
            )}
          </Card>
        )}
      </div>
    </StudentShell>
  );
}
