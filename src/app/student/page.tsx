import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { StudentShell } from "../../components/student/student-shell";
import { getServerAccessContext } from "../../server/access/actor";
import { getStudentProgressOverview } from "../../server/student/progress-overview";
import { nextStudentCourseAction } from "../../server/student/next-action";
import { getStudentExamCatalog } from "../../server/assessments/exam-management";
import { StudentExamCard } from "../../components/student/student-exam-card";
import { getStudentProfile } from "../../server/student/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه دانش‌آموز | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentHomePage() {
  if (
    !process.env.DATABASE_URL ||
    !process.env.BETTER_AUTH_SECRET ||
    !process.env.BETTER_AUTH_URL
  ) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const [progressOverview, examCatalog, profile] = await Promise.all([
    getStudentProgressOverview(actor.userId),
    getStudentExamCatalog(actor.userId),
    getStudentProfile(actor.userId),
  ]);
  const { courses, hasMore } = progressOverview;
  const exams = examCatalog?.exams ?? [];
  const countLabel = hasMore ? "۲۰+" : courses.length.toLocaleString("fa-IR");
  const featuredCourse = courses[0];
  const featuredAction = featuredCourse
    ? nextStudentCourseAction(
      featuredCourse.courseId,
      featuredCourse.readyVideos,
      featuredCourse.markedVideos,
      featuredCourse.practice.state,
    )
    : null;
  const progressPercent = (marked: number, ready: number) => ready > 0
    ? Math.min(100, Math.round((marked / ready) * 100))
    : 0;

  return (
    <StudentShell active="home" title="خانه من">
      <div className="space-y-7">
        <section
          aria-labelledby="student-home-title"
          className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8"
        >
          <p className="text-sm font-bold text-dena-brand">خانه من در دنا</p>
          <h2
            id="student-home-title"
            className="mt-2 text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]"
          >
            سلام، {profile?.name || "به دنا خوش آمدی"} 👋
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            آماده‌ای مسیر امروزت رو ادامه بدی؟
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/student/courses" className={buttonClassName()}>
              دوره‌های من
            </Link>
            <Link href="/student/ai-tutor" className={buttonClassName("outline")}>
              معلم هوشمند
            </Link>
            <Link href="/student/progress" className={buttonClassName("outline")}>
              پیگیری یادگیری
            </Link>
            <Link href="/student/assessments" className={buttonClassName("outline")}>
              آزمون‌ها و ارزیابی‌ها
            </Link>
            <Link href="/student/services" className={buttonClassName("outline")}>
              مرکز خدمات
            </Link>
          </div>
        </section>

        <section aria-labelledby="student-ai-tutor" className="rounded-[22px] border border-dena-border bg-white p-6 shadow-[0_8px_12px_rgba(91,76,226,0.08)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-dena-brand">همراه یادگیری دنا</p>
              <h2 id="student-ai-tutor" className="mt-2 text-xl font-extrabold text-dena-ink md:text-2xl">
                معلم هوشمند
              </h2>
              <p className="mt-2 text-sm leading-8 text-dena-muted">
                با داده‌های آموزشی دنا آغاز می‌شود و بعد با ویدئوهای مجاز دوره‌های تو، برای مسیر خودت رشد می‌کند. گفت‌وگو پس از آماده‌سازی و ارزیابی سرویس فعال می‌شود.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">
              <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
              در حال آماده‌سازی
            </div>
          </div>
          <div className="mt-5">
            <Link href="/student/ai-tutor" className={buttonClassName()}>
              آشنایی با معلم هوشمند
            </Link>
          </div>
        </section>

        {featuredCourse && featuredAction && (
          <section aria-labelledby="student-continue-course" className="space-y-4">
            <Card className="space-y-5 rounded-[22px] p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-dena-brand">ادامهٔ یادگیری</p>
                  <h2 id="student-continue-course" className="mt-1 text-xl font-extrabold text-dena-deep md:text-2xl">
                    {featuredCourse.title}
                  </h2>
                  <p className="mt-2 text-sm text-dena-muted">
                    تازه‌ترین دورهٔ ثبت‌نام‌شدهٔ قابل ادامه
                  </p>
                </div>
                <span className="rounded-full bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">
                  {featuredCourse.practice.state === "answered"
                    ? "تمرین پاسخ داده شده"
                    : featuredCourse.practice.state === "not_attempted"
                      ? "تمرین آمادهٔ پاسخ"
                      : "در حال یادگیری"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-dena-muted">
                  <span>علامت‌های تکمیل ویدئو به انتخاب خودت</span>
                  <span>
                    {featuredCourse.markedVideos.toLocaleString("fa-IR")} از {featuredCourse.readyVideos.toLocaleString("fa-IR")}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="نسبت ویدئوهایی که خود دانش‌آموز تکمیل‌شده علامت زده است"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent(featuredCourse.markedVideos, featuredCourse.readyVideos)}
                  className="h-2.5 overflow-hidden rounded-full bg-dena-lavender"
                >
                  <div
                    className="h-full rounded-full bg-dena-mint transition-[width]"
                    style={{ width: `${progressPercent(featuredCourse.markedVideos, featuredCourse.readyVideos)}%` }}
                  />
                </div>
                <p className="text-xs leading-6 text-dena-muted">
                  این شمار خوداظهاری است و اثبات تماشا یا نمرهٔ رسمی نیست.
                </p>
              </div>
              <Link href={featuredAction.href} className={buttonClassName()}>
                {featuredAction.label}
              </Link>
            </Card>
          </section>
        )}

        {exams.length > 0 && (
          <section aria-labelledby="student-upcoming-exams" className="space-y-4">
            <SectionHeading id="student-upcoming-exams"
              note="فقط آزمون‌های منتشرشده و تلاش‌های خودت">
              آزمون‌های من
            </SectionHeading>
            <div className="grid gap-4 md:grid-cols-2">
              {exams.slice(0, 4).map((exam) => (
                <StudentExamCard key={exam.id} exam={exam} />
              ))}
            </div>
            {exams.length > 4 && (
              <Link href="/student/assessments"
                className="text-sm font-bold text-dena-brand underline-offset-4 hover:underline">
                دیدن همهٔ آزمون‌ها
              </Link>
            )}
          </section>
        )}

        <section aria-labelledby="my-courses" className="space-y-4">
          <SectionHeading id="my-courses">ادامه یادگیری در دوره‌ها</SectionHeading>
          {courses.length === 0 ? (
            <Card className="space-y-4">
              <h3 className="text-lg font-extrabold">
                فعلاً دورهٔ قابل ادامه‌ای نداری
              </h3>
              <p className="text-sm leading-8 text-dena-muted">
                دوره‌ای ثبت‌نام نکرده‌ای یا دسترسی قبلی به‌دلیل تغییر وضعیت انتشار،
                نظارت یا محتوای آماده دیگر برقرار نیست.
              </p>
              <Link href="/student/courses" className={buttonClassName("secondary")}>
                دیدن دوره‌ها
              </Link>
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const action = nextStudentCourseAction(
                  course.courseId,
                  course.readyVideos,
                  course.markedVideos,
                  course.practice.state,
                );
                return (
                  <li
                    key={course.courseId}
                    className="space-y-4 rounded-2xl border border-dena-border bg-white p-6"
                  >
                    <div>
                      <p className="text-xs font-semibold text-dena-brand">
                        ثبت‌نام فعال
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold leading-8">
                        {course.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-7 text-dena-deep">
                      علامت‌خورده به انتخاب خودت:{" "}
                      <strong>{course.markedVideos.toLocaleString("fa-IR")}</strong>
                      {" "}از{" "}
                      <strong>{course.readyVideos.toLocaleString("fa-IR")}</strong>
                      {" "}ویدئوی آماده
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-dena-muted">
                        <span>علامت‌های تکمیل خوداظهاری</span>
                        <span>{progressPercent(course.markedVideos, course.readyVideos).toLocaleString("fa-IR")}٪</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`نسبت ویدئوهای علامت‌خورده در دورهٔ ${course.title}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent(course.markedVideos, course.readyVideos)}
                        className="h-2 overflow-hidden rounded-full bg-dena-lavender"
                      >
                        <div
                          className="h-full rounded-full bg-dena-mint"
                          style={{ width: `${progressPercent(course.markedVideos, course.readyVideos)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs leading-7 text-dena-muted">
                      {course.practice.state === "not_attempted"
                        ? "تمرین کوتاه تأییدشده در انتظار پاسخ توست."
                        : course.practice.state === "answered"
                          ? "پاسخ تمرین کوتاه تو ثبت شده است."
                          : "تمرین کوتاه تأییدشده‌ای در دسترس نیست."}
                    </p>
                    <Link href={action.href} className={buttonClassName()}>
                      {action.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && (
            <p className="text-sm text-dena-muted">
              این صفحه حداکثر ۲۰ دوره اخیرِ قابل ادامه را نمایش می‌دهد.
            </p>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-label="ادامه مسیر یادگیری">
          <Card className="flex flex-col justify-between gap-5 rounded-[22px] p-5 md:p-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h2>
                <span className="rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">
                  {exams.length.toLocaleString("fa-IR")} آزمون منتشرشده
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-dena-muted">
                تمرین‌ها و آزمون‌های در دسترس از دوره‌های مجاز خودت را ببین و ادامه بده.
              </p>
            </div>
            <Link href="/student/assessments" className={buttonClassName("outline")}>
              مشاهده همه تمرین‌ها و آزمون‌ها
            </Link>
          </Card>
          <Card className="flex flex-col justify-between gap-5 rounded-[22px] p-5 md:p-6">
            <div>
              <h2 className="text-lg font-extrabold text-dena-deep">مسیر رشد من</h2>
              <p className="mt-3 text-sm leading-7 text-dena-muted">
                با ادامه مسیر یادگیری، پیشرفتت به‌صورت ساده نمایش داده می‌شود.
              </p>
              <p className="mt-3 text-xs leading-6 text-dena-muted">
                {progressOverview.displayedMarkedVideos.toLocaleString("fa-IR")} از {progressOverview.displayedReadyVideos.toLocaleString("fa-IR")} ویدئوی آماده را خودت تکمیل‌شده علامت زده‌ای؛ این اطلاعات خوداظهاری است.
              </p>
            </div>
            <Link href="/student/growth" className={buttonClassName("outline")}>
              مشاهده مسیر رشد
            </Link>
          </Card>
        </section>

        <Card className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] p-5 md:p-6">
          <div>
            <h2 className="text-lg font-extrabold text-dena-deep">باشگاه نخبگان</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              با ادامه مسیر یادگیری، اطلاعات و وضعیت عضویت باشگاه را دنبال کن.
            </p>
          </div>
          <Link href="/student/elite-club" className={buttonClassName("outline")}>
            مشاهده باشگاه
          </Link>
        </Card>
      </div>
    </StudentShell>
  );
}
