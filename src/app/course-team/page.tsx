import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { getServerIdentity } from "@/server/access/identity";
import {
  getActiveCourseTeamAssignments,
  getCourseTeamInbox,
} from "@/server/course-team/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "فضای تیم آموزشی | دنا",
  robots: { index: false, follow: false },
};

function roleLabel(role: "teacher" | "academic_supporter" | "counselor") {
  if (role === "teacher") return "مدرس";
  if (role === "academic_supporter") return "پشتیبان تحصیلی";
  return "مشاور";
}

export default async function CourseTeamWorkspacePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const identity = await getServerIdentity();
  if (!identity) redirect("/login");

  const [assignments, inbox] = await Promise.all([
    getActiveCourseTeamAssignments(identity.userId),
    getCourseTeamInbox(identity.userId),
  ]);

  if (assignments.length === 0) redirect("/account");

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-7 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-dena-brand">تیم آموزشی دوره</p>
          <h1 className="mt-2 text-3xl font-extrabold text-dena-deep">
            فضای ارتباط آموزشی
          </h1>
        </div>
        <Link href="/account" className={buttonClassName("outline")}>
          بازگشت به حساب من
        </Link>
      </header>

      <Card className="rounded-[22px] p-6">
        <h2 className="text-lg font-extrabold">تخصیص‌های فعال شما</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.teamMemberId}
              className="rounded-2xl bg-dena-bg p-4"
            >
              <p className="text-xs font-bold text-dena-brand">
                {roleLabel(assignment.role)}
              </p>
              <p className="mt-2 font-extrabold">{assignment.courseTitle}</p>
              <p className="mt-2 text-xs leading-6 text-dena-muted">
                این دسترسی فقط به همین دوره و همین نقش محدود است.
              </p>
              {assignment.role === "academic_supporter" && (
                <Link
                  href={`/course-team/${assignment.teamMemberId}/problem-solving`}
                  className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-xs font-bold text-dena-brand"
                >
                  جلسات رفع اشکال
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>

      <section aria-labelledby="course-team-inbox" className="space-y-4">
        <div>
          <h2 id="course-team-inbox" className="text-xl font-extrabold">
            گفت‌وگوهای دوره
          </h2>
          <p className="mt-1 text-sm leading-7 text-dena-muted">
            فقط دانش‌آموزانی نمایش داده می‌شوند که در دوره تخصیص‌یافته به شما
            ثبت‌نام فعال دارند و گفت‌وگو را آغاز کرده‌اند.
          </p>
        </div>

        {inbox.length === 0 ? (
          <Card className="rounded-[22px] p-6">
            <p className="font-bold">هنوز گفت‌وگویی برای پاسخ ندارید.</p>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              به محض ثبت پیام از طرف دانش‌آموز در محدوده مجاز، همان گفت‌وگو
              در این بخش ظاهر می‌شود.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {inbox.map((item) => (
              <li key={item.conversationId}>
                <Link
                  href={`/course-team/${item.teamMemberId}/conversations/${item.conversationId}`}
                  className="block rounded-[22px] border border-dena-border bg-white p-5 transition hover:border-dena-brand hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-dena-brand">
                        {roleLabel(item.role)} · {item.courseTitle}
                      </p>
                      <h3 className="mt-2 text-lg font-extrabold">
                        {item.studentName}
                      </h3>
                    </div>
                    {item.lastMessageAt && (
                      <time className="text-xs text-dena-muted">
                        {item.lastMessageAt.toLocaleString("fa-IR")}
                      </time>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-dena-muted">
                    بازکردن گفت‌وگوی همین دوره
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="rounded-[22px] border-dashed p-5">
        <p className="text-xs leading-7 text-dena-muted">
          این فضا دسترسی به یادداشت‌های شخصی دانش‌آموز، اطلاعات احراز هویت،
          شماره تماس یا دوره‌های خارج از assignment شما ایجاد نمی‌کند.
        </p>
      </Card>
    </main>
  );
}
