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
const dateOptions: Intl.DateTimeFormatOptions = {
  calendar: "persian",
  numberingSystem: "arab",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tehran",
};
const dateTime = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  ...dateOptions,
  hour: "2-digit",
  minute: "2-digit",
}).format(value);
const sessionDate = (value: Date) => new Intl.DateTimeFormat("fa-IR", dateOptions).format(value);
const sessionTime = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  numberingSystem: "arab",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Tehran",
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
  const statusClass = session.status === "scheduled"
    ? "border-[#fff7d6] bg-[#fff7d6] text-[#b47800]"
    : session.status === "held"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : "border-dena-border bg-dena-bg text-dena-muted";

  return <StudentShell active="courses" title="جزئیات جلسه رفع اشکال">
    <div className="-mt-1 mx-auto max-w-2xl space-y-4 md:mt-0 md:space-y-5">
      <Link href={listHref} className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex">بازگشت به جلسات رفع اشکال</Link>
      <Card className="flex h-[78px] flex-col items-start justify-center rounded-[16px] px-4 text-right md:h-auto md:rounded-[22px] md:px-6 md:py-5">
        <h1 className="text-[18px] font-bold leading-7 text-dena-deep">{session.subject}</h1>
        <p className="text-[12px] leading-5 text-dena-muted">{session.courseTitle}</p>
      </Card>

      <Card className="h-[412px] rounded-[16px] p-[15px] md:h-auto md:space-y-5 md:rounded-[22px] md:p-6">
        <div className="flex h-7 items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-[17px] font-bold leading-7 text-dena-deep">{session.subject}</h2>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold leading-[18px] ${statusClass}`}>{labels[session.status]}</span>
        </div>

        <dl className="mt-6 grid gap-y-[34px] md:mt-0 md:grid-cols-2 md:gap-3">
          <div className="flex h-5 items-center text-right md:h-auto md:rounded-xl md:bg-dena-bg md:p-4">
            <dt className="w-[96px] shrink-0 text-[12px] leading-5 text-dena-muted md:w-auto">پشتیبان</dt>
            <dd className="w-[214px] shrink-0 text-[13px] font-semibold leading-5 text-dena-deep md:w-auto md:flex-1 md:text-sm">{session.supporterName}</dd>
          </div>
          <div className="flex h-5 items-center text-right md:h-auto md:rounded-xl md:bg-dena-bg md:p-4">
            <dt className="w-[96px] shrink-0 text-[12px] leading-5 text-dena-muted md:w-auto">دوره</dt>
            <dd className="w-[214px] shrink-0 text-[13px] font-semibold leading-5 text-dena-deep md:w-auto md:flex-1 md:text-sm">{session.courseTitle}</dd>
          </div>
          <div className="flex h-5 items-center text-right md:h-auto md:rounded-xl md:bg-dena-bg md:p-4">
            <dt className="w-[96px] shrink-0 text-[12px] leading-5 text-dena-muted md:w-auto">تاریخ</dt>
            <dd className="w-[214px] shrink-0 text-[13px] font-semibold leading-5 text-dena-deep md:w-auto md:flex-1 md:text-sm">
              <time dateTime={session.scheduledAt.toISOString()}>{sessionDate(session.scheduledAt)}</time>
            </dd>
          </div>
          <div className="flex h-5 items-center text-right md:h-auto md:rounded-xl md:bg-dena-bg md:p-4">
            <dt className="w-[96px] shrink-0 text-[12px] leading-5 text-dena-muted md:w-auto">زمان</dt>
            <dd className="w-[214px] shrink-0 text-[13px] font-semibold leading-5 text-dena-deep md:w-auto md:flex-1 md:text-sm">
              <time dateTime={session.scheduledAt.toISOString()}>{sessionTime(session.scheduledAt)}</time>
            </dd>
          </div>
        </dl>

        <section className="mt-[38px] h-[92px] rounded-[12px] border border-dena-border bg-[#f7f6fb] px-3 py-2 md:mt-0 md:h-auto md:rounded-xl md:p-4">
          <h3 className="text-[13px] font-bold leading-[22px] text-dena-deep">اطلاعات جلسه</h3>
          <p className="mt-1 text-[11px] leading-5 text-dena-muted md:text-sm md:leading-7">
            جزئیات جلسه فقط در صورت ثبت توسط آموزشگاه نمایش داده می‌شود.
          </p>
        </section>
      </Card>
    </div>
  </StudentShell>;
}
