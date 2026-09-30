import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import {
  ProblemRequestActions,
  ProblemSessionActions,
} from "@/components/course-team/problem-solving-actions";
import { getServerAccessContext } from "@/server/access/actor";
import { getSupporterProblemSolving } from "@/server/course-team/problem-solving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "جلسات رفع اشکال | دنا",
  robots: { index: false, follow: false },
};

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

export default async function SupporterProblemSolvingPage({
  params,
}: {
  params: Promise<{ teamMemberId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");

  const { teamMemberId } = await params;
  if (!z.uuid().safeParse(teamMemberId).success) notFound();

  const data = await getSupporterProblemSolving(actor.userId, teamMemberId);
  if (!data) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-7 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-dena-brand">پشتیبان تحصیلی</p>
          <h1 className="mt-2 text-3xl font-extrabold text-dena-deep">
            جلسات رفع اشکال
          </h1>
          <p className="mt-2 text-sm text-dena-muted">
            {data.assignment.courseTitle}
          </p>
        </div>
        <Link href="/course-team"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به فضای تیم آموزشی
        </Link>
      </header>

      <section aria-labelledby="problem-requests" className="space-y-4">
        <div>
          <h2 id="problem-requests" className="text-xl font-extrabold">
            درخواست‌های دانش‌آموزان
          </h2>
          <p className="mt-1 text-sm leading-7 text-dena-muted">
            فقط درخواست‌های دانش‌آموزان همین دوره و همین assignment نمایش داده می‌شوند.
          </p>
        </div>

        {data.requests.length === 0 ? (
          <Card className="rounded-[22px] p-6">
            <p className="font-bold">هنوز درخواستی ثبت نشده است.</p>
          </Card>
        ) : (
          <ul className="grid gap-4">
            {data.requests.map((request) => (
              <li key={request.id}>
                <Card className="rounded-[22px] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-dena-brand">
                        {request.studentName}
                      </p>
                      <h3 className="mt-2 text-lg font-extrabold">
                        {request.subject}
                      </h3>
                    </div>
                    <span className="rounded-full bg-dena-bg px-3 py-1 text-xs font-bold text-dena-deep">
                      {requestStatusLabel[request.status]}
                    </span>
                  </div>

                  {request.description && (
                    <p className="mt-3 text-sm leading-7 text-dena-muted">
                      {request.description}
                    </p>
                  )}

                  <time className="mt-3 block text-xs text-dena-muted">
                    {request.createdAt.toLocaleString("fa-IR")}
                  </time>

                  <ProblemRequestActions
                    teamMemberId={teamMemberId}
                    requestId={request.id}
                    status={request.status}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="problem-sessions" className="space-y-4">
        <h2 id="problem-sessions" className="text-xl font-extrabold">
          جلسه‌های ثبت‌شده
        </h2>

        {data.sessions.length === 0 ? (
          <Card className="rounded-[22px] p-6">
            <p className="font-bold">هنوز جلسه‌ای ثبت نشده است.</p>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.sessions.map((session) => (
              <li key={session.id}>
                <Card className="h-full rounded-[22px] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-dena-brand">
                        {session.studentName}
                      </p>
                      <h3 className="mt-2 font-extrabold">{session.subject}</h3>
                    </div>
                    <span className="rounded-full bg-dena-bg px-3 py-1 text-xs font-bold text-dena-deep">
                      {sessionStatusLabel[session.status]}
                    </span>
                  </div>
                  <time className="mt-4 block text-sm font-bold text-dena-deep">
                    {session.scheduledAt.toLocaleString("fa-IR")}
                  </time>

                  <ProblemSessionActions
                    teamMemberId={teamMemberId}
                    sessionId={session.id}
                    status={session.status}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="rounded-[22px] border-dashed p-5">
        <p className="text-xs leading-7 text-dena-muted">
          این بخش به یادداشت‌های خصوصی دانش‌آموز یا اطلاعات احراز هویت دسترسی ندارد.
          مدت جلسه، محل برگزاری و ابزار تماس فقط در صورت تعریف مستقل محصول اضافه خواهند شد.
        </p>
      </Card>
    </main>
  );
}
