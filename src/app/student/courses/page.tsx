import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { buttonClassName } from "../../../components/ui/button";
import { FreeCourses } from "../../../components/student/free-courses";
import { StudentShell } from "../../../components/student/student-shell";
import { getServerAccessContext } from "../../../server/access/actor";
import { getStudentProgressOverview } from "../../../server/student/progress-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دوره‌های من | دنا", robots: { index: false, follow: false } };

const filters = [
  { value: "all", label: "همه" },
  { value: "learning", label: "در حال یادگیری" },
  { value: "complete", label: "تکمیل‌شده" },
] as const;

export default async function StudentCoursesPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "student")) notFound();

  const [{ status: queryStatus }, progress] = await Promise.all([
    searchParams,
    getStudentProgressOverview(actor.userId),
  ]);
  const status = filters.some((filter) => filter.value === queryStatus) ? queryStatus! : "all";
  const visibleCourses = progress.courses.filter((course) => {
    const complete = course.readyVideos > 0 && course.markedVideos >= course.readyVideos;
    if (status === "complete") return complete;
    if (status === "learning") return !complete;
    return true;
  });

  return (
    <StudentShell active="courses" title="دوره‌های من">
      <div className="space-y-7">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">دوره‌های من</p>
          <h1 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">دوره‌هایی که در آن‌ها ثبت‌نام کرده‌ای</h1>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">یادگیری خودت را ادامه بده و وضعیت جلسه‌های دوره را ببین.</p>
        </section>

        <section className="space-y-4" aria-labelledby="student-my-courses">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="student-my-courses" className="text-xl font-extrabold text-dena-deep">دوره‌های ثبت‌نام‌شده</h2>
            <nav aria-label="فیلتر دوره‌ها" className="flex flex-wrap gap-2">
              {filters.map((filter) => <Link key={filter.value}
                href={filter.value === "all" ? "/student/courses" : `/student/courses?status=${filter.value}`}
                aria-current={status === filter.value ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold ${status === filter.value ? "bg-dena-brand text-white" : "bg-white text-dena-muted ring-1 ring-dena-border"}`}>
                {filter.label}
              </Link>)}
            </nav>
          </div>

          {visibleCourses.length === 0 ? (
            <Card className="rounded-[22px] p-6">
              <h3 className="font-extrabold text-dena-deep">{progress.courses.length === 0 ? "هنوز در دوره‌ای ثبت‌نام نکرده‌ای" : "دوره‌ای با این وضعیت پیدا نشد"}</h3>
              <p className="mt-2 text-sm leading-7 text-dena-muted">از فهرست دوره‌های قابل ثبت‌نام، دوره‌ای را برای شروع انتخاب کن.</p>
              <Link href="#available-courses" className={buttonClassName("secondary", "mt-4")}>دیدن دوره‌های قابل ثبت‌نام</Link>
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {visibleCourses.map((course) => {
                const percent = course.readyVideos > 0 ? Math.min(100, Math.round(course.markedVideos / course.readyVideos * 100)) : 0;
                const complete = course.readyVideos > 0 && course.markedVideos >= course.readyVideos;
                return <li key={course.courseId}>
                  <Card className="flex h-full flex-col gap-4 rounded-[22px] p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="text-lg font-extrabold text-dena-deep">{course.title}</h3><p className="mt-1 text-sm text-dena-muted">{complete ? "تکمیل‌شده بر اساس علامت‌های شخصی" : "در حال یادگیری"}</p></div>
                      <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">{percent.toLocaleString("fa-IR")}٪</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-dena-lavender" role="progressbar" aria-label={`علامت‌های تکمیل شخصی برای ${course.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                      <div className="h-full rounded-full bg-dena-mint" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-sm text-dena-muted">{course.markedVideos.toLocaleString("fa-IR")} از {course.readyVideos.toLocaleString("fa-IR")} جلسهٔ آماده را خودت تکمیل‌شده علامت زده‌ای.</p>
                    <p className="text-xs leading-6 text-dena-muted">این وضعیت خوداظهاری است و زمان تماشا یا یادگیری را اثبات نمی‌کند.</p>
                    <Link href={`/student/courses/${course.courseId}`} className={buttonClassName("secondary", "mt-auto")}>{complete ? "مشاهده دوره" : "ادامه یادگیری"}</Link>
                  </Card>
                </li>;
              })}
            </ul>
          )}
          {progress.hasMore && <p className="text-xs leading-6 text-dena-muted">برای حفظ سرعت صفحه، این نما حداکثر ۲۰ دوره را نمایش می‌دهد.</p>}
        </section>

        <section id="available-courses" className="space-y-4 border-t border-dena-border pt-6" aria-labelledby="available-courses-title">
          <div><p className="text-sm font-bold text-dena-brand">شروع یادگیری تازه</p><h2 id="available-courses-title" className="mt-1 text-xl font-extrabold text-dena-deep">دوره‌های رایگان قابل ثبت‌نام</h2><p className="mt-1 text-sm leading-7 text-dena-muted">فقط دوره‌های منتشرشده با نظارت تأییدشده و محتوای آماده برای ثبت‌نام نشان داده می‌شوند.</p></div>
          <Card className="rounded-[22px] p-5 md:p-7"><FreeCourses /></Card>
        </section>
      </div>
    </StudentShell>
  );
}
