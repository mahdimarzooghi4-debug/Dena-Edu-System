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
import { ProblemSolvingRequestForm } from "@/components/student/problem-solving-request-form";

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
      <div className="space-y-6">
        <Link
          href={`/student/courses/${courseId}`}
          className="text-sm font-bold text-dena-brand hover:underline"
        >
          بازگشت به جزئیات دوره
        </Link>

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
            ارتباط با این عضو فقط در چارچوب همین دوره انجام می‌شود و اطلاعات
            تماس شخصی او در این بخش نمایش داده نمی‌شود.
          </p>

          {member.role !== "teacher" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/student/courses/${courseId}/team/${teamMemberId}/conversation`}
                className={buttonClassName()}
              >
                مشاهده گفت‌وگو
              </Link>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
              مسیر ارتباط مستقیم با مدرس در این نسخه تعریف نشده است.
            </p>
          )}
        </Card>

        {member.role === "academic_supporter" && problemSolving && (
          <div className="space-y-4">
            <Card className="rounded-[22px] p-6">
              <h2 className="text-lg font-extrabold">جلسات رفع اشکال</h2>
              <p className="mt-2 text-sm leading-8 text-dena-muted">
                درخواست جلسه فقط زمانی فعال است که مؤسسه مسئول این امکان را
                برای همین پشتیبان و همین دوره روشن کرده باشد.
              </p>

              {problemSolving.requestsEnabled ? (
                <div className="mt-5">
                  <ProblemSolvingRequestForm
                    courseId={courseId}
                    teamMemberId={teamMemberId}
                  />
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
                  درخواست جلسه رفع اشکال در حال حاضر برای این پشتیبان فعال نیست.
                </p>
              )}
            </Card>

            <Card className="rounded-[22px] p-6">
              <h3 className="text-base font-extrabold">درخواست‌های شما</h3>
              {problemSolving.requests.length === 0 ? (
                <p className="mt-3 text-sm text-dena-muted">
                  هنوز درخواستی ثبت نکرده‌اید.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {problemSolving.requests.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-2xl border border-dena-border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{request.subject}</p>
                          {request.description && (
                            <p className="mt-2 text-sm leading-7 text-dena-muted">
                              {request.description}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-dena-bg px-3 py-1 text-xs font-bold text-dena-deep">
                          {requestStatusLabel[request.status]}
                        </span>
                      </div>
                      <time className="mt-3 block text-xs text-dena-muted">
                        {request.createdAt.toLocaleString("fa-IR")}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="rounded-[22px] p-6">
              <h3 className="text-base font-extrabold">جلسه‌های ثبت‌شده</h3>
              {problemSolving.sessions.length === 0 ? (
                <p className="mt-3 text-sm text-dena-muted">
                  جلسه رفع اشکالی برای شما ثبت نشده است.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {problemSolving.sessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-2xl border border-dena-border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-bold">{session.subject}</p>
                        <span className="rounded-full bg-dena-bg px-3 py-1 text-xs font-bold text-dena-deep">
                          {sessionStatusLabel[session.status]}
                        </span>
                      </div>
                      <time className="mt-3 block text-sm font-semibold text-dena-deep">
                        {session.scheduledAt.toLocaleString("fa-IR")}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {member.role === "counselor" && (
          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">تعامل با مشاور</h2>
            <p className="mt-2 text-sm leading-8 text-dena-muted">
              نوع خدمات مشاور توسط مؤسسه تعریف می‌شود. دنا در این مرحله
              مسئولیت یا نوع جلسه‌ای فراتر از گفت‌وگوی مجاز دوره فرض نمی‌کند.
            </p>
          </Card>
        )}
      </div>
    </StudentShell>
  );
}
