import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { StudentShell } from "../../components/student/student-shell";
import { getServerAccessContext } from "../../server/access/actor";
import { getStudentProgressOverview } from "../../server/student/progress-overview";
import { getStudentExamCatalog } from "../../server/assessments/exam-management";
import { StudentExamCard } from "../../components/student/student-exam-card";
import { getStudentProfile } from "../../server/student/profile";
import { getStudentCourseDetail } from "../../server/student/course-detail";
import { getStudentVideoProgress } from "../../server/student/video-progress";
import { hasStudentEntitlement } from "../../server/student/entitlement";
import type { StudentExamCardData } from "../../components/student/student-exam-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خانه دانش‌آموز | دنا", robots: { index: false, follow: false } };

function progressPercent(marked: number, ready: number) {
  return ready > 0 ? Math.min(100, Math.round(marked / ready * 100)) : 0;
}

function activityDate(value: string | null) {
  if (!value) return "فعالیت ثبت‌شده‌ای نیست";
  const date = new Date(value);
  const format = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran", dateStyle: "short",
  });
  return format.format(date) === format.format(new Date())
    ? "امروز"
    : format.format(date);
}

async function loadHomeCourse(studentId: string, course: {
  courseId: string;
  title: string;
  readyVideos: number;
  markedVideos: number;
  lastActivityAt: string | null;
  practice: { state: "not_available" | "not_attempted" } | {
    state: "answered"; selectedOption: number; correct: boolean; submittedAt: string;
  };
}) {
  const [detail, entitled] = await Promise.all([
    getStudentCourseDetail(studentId, course.courseId),
    hasStudentEntitlement(studentId, course.courseId),
  ]);
  const videos = entitled ? await getStudentVideoProgress(studentId, course.courseId) : [];
  const firstUnmarked = videos.findIndex((video) => !video.completed);
  const currentIndex = firstUnmarked >= 0 ? firstUnmarked : Math.max(0, videos.length - 1);
  return { ...course, detail, entitled, videos, currentVideo: videos[currentIndex] ?? null, currentIndex, totalVideos: detail?.readyVideoCount ?? course.readyVideos };
}

function examActivityLabel(exam: StudentExamCardData) {
  if (exam.attemptStatus === "submitted") return "انجام‌شده";
  if (exam.attemptStatus === "in_progress") return "در حال انجام";
  if (exam.canStart) return "آماده انجام";
  return "در انتظار";
}

export default async function StudentHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const [progress, examCatalog, profile] = await Promise.all([
    getStudentProgressOverview(actor.userId),
    getStudentExamCatalog(actor.userId),
    getStudentProfile(actor.userId),
  ]);
  const homeCourses = await Promise.all(progress.courses.slice(0, 3).map((course) =>
    loadHomeCourse(actor.userId, course)));
  const availableCourses = homeCourses.filter((course) => course.detail && course.entitled);
  const featuredCourse = availableCourses[0];
  const exams = (examCatalog?.exams ?? []) as StudentExamCardData[];
  const now = new Date();
  const featuredExam = exams.find((exam) => exam.canStart) ??
    exams.find((exam) => exam.status === "published" && exam.startsAt > now);

  const activityItems = [
    ...exams.slice(0, 3).map((exam) => ({
      id: `exam-${exam.id}`,
      title: exam.title,
      state: examActivityLabel(exam),
      sortAt: exam.startsAt.getTime(),
      href: "/student/assessments",
    })),
    ...availableCourses.flatMap((course) => {
      if (course.practice.state === "not_available") return [];
      return [{
        id: `practice-${course.courseId}`,
        title: `تمرین کوتاه · ${course.title}`,
        state: course.practice.state === "answered" ? "انجام‌شده" : "در انتظار",
        sortAt: course.practice.state === "answered"
          ? new Date(course.practice.submittedAt).getTime() : 0,
        href: `/student/assessments?courseId=${encodeURIComponent(course.courseId)}`,
      }];
    }),
  ].sort((a, b) => b.sortAt - a.sortAt).slice(0, 3);

  return (
    <StudentShell active="home" title="خانه من">
      <div className="space-y-7">
        <section aria-labelledby="student-home-title" className="px-1 py-1">
          <h2 id="student-home-title" className="text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
            سلام، {profile?.name || "به دنا خوش آمدی"} 👋
          </h2>
          <p className="mt-2 text-sm leading-8 text-dena-muted">آماده‌ای مسیر امروزت رو ادامه بدی؟</p>
        </section>

        {featuredCourse ? (
          <Card className="space-y-5 rounded-[22px] p-6 md:p-7">
            <div className="space-y-3">
              <h2 id="student-continue-course" className="text-xl font-extrabold text-dena-deep md:text-2xl">{featuredCourse.title}</h2>
              <p className="text-sm text-dena-muted">{featuredCourse.detail!.responsibleInstituteName}</p>
              {featuredCourse.currentVideo ? <div className="space-y-1">
                <span className="inline-flex rounded-full bg-dena-lavender px-3 py-1.5 text-sm font-bold text-dena-brand">{featuredCourse.currentVideo.title}</span>
                <p className="text-sm text-dena-muted">
                  جلسه { (featuredCourse.currentIndex + 1).toLocaleString("fa-IR") } از {featuredCourse.totalVideos.toLocaleString("fa-IR")}
                </p>
              </div> : <p className="text-sm text-dena-muted">جلسهٔ آماده‌ای برای ادامه وجود ندارد.</p>}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-bold text-dena-deep">{progressPercent(featuredCourse.markedVideos, featuredCourse.readyVideos).toLocaleString("fa-IR")}٪ پیشرفت</span>
                <span className="text-xs text-dena-muted">آخرین فعالیت: {activityDate(featuredCourse.lastActivityAt)}</span>
              </div>
              <div role="progressbar" aria-label="نسبت ویدئوهایی که خود دانش‌آموز تکمیل‌شده علامت زده است" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent(featuredCourse.markedVideos, featuredCourse.readyVideos)} className="h-2.5 overflow-hidden rounded-full bg-dena-lavender">
                <div className="h-full rounded-full bg-dena-mint transition-[width]" style={{ width: `${progressPercent(featuredCourse.markedVideos, featuredCourse.readyVideos)}%` }} />
              </div>
              <p className="text-xs leading-6 text-dena-muted">این درصد بر پایهٔ علامت‌های اختیاری خودت است و تماشای کامل یا نمرهٔ رسمی را ثابت نمی‌کند.</p>
            </div>
            {featuredCourse.currentVideo ? <Link href={`/student/courses/${featuredCourse.courseId}/watch?video=${encodeURIComponent(featuredCourse.currentVideo.assetId)}`} className={buttonClassName()}>
              ادامه یادگیری
            </Link> : <Link href={`/student/courses/${featuredCourse.courseId}`} className={buttonClassName()}>مشاهده دوره</Link>}
          </Card>
        ) : (
          <Card className="rounded-[22px] p-6">
            <h2 className="font-extrabold text-dena-deep">دورهٔ قابل ادامه‌ای نداری</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">وقتی دوره‌ای در دسترس داشته باشی، ادامهٔ یادگیری‌ات اینجا نمایش داده می‌شود.</p>
            <Link href="/student/courses" className={buttonClassName("secondary", "mt-4")}>مشاهده دوره‌ها</Link>
          </Card>
        )}

        <section aria-label="قدم بعدی یادگیری">
          {featuredExam ? <StudentExamCard exam={featuredExam} featured /> : (
            <Card className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] p-6">
              <div><p className="text-sm font-bold text-dena-muted">قدم بعدی</p><h2 className="mt-2 font-extrabold text-dena-deep">آزمون آماده‌ای برای شروع نداری</h2><p className="mt-2 text-sm text-dena-muted">آزمون‌های دوره‌هایت را در فهرست فعالیت‌ها ببین.</p></div>
              <Link href="/student/assessments" className={buttonClassName("outline")}>تمرین‌ها و آزمون‌ها</Link>
            </Card>
          )}
        </section>

        <section aria-labelledby="my-courses" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading id="my-courses">دوره‌های من</SectionHeading>
            <Link href="/student/courses" className="text-sm font-bold text-dena-brand hover:underline">مشاهده همه دوره‌ها</Link>
          </div>
          {availableCourses.length === 0 ? (
            <Card className="rounded-[22px] p-5 text-sm leading-7 text-dena-muted">دوره‌ای در دسترس نیست.</Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-3">
              {availableCourses.map((course) => {
                const provider = course.detail!.responsibleInstituteName;
                const href = course.currentVideo
                  ? `/student/courses/${course.courseId}/watch?video=${encodeURIComponent(course.currentVideo.assetId)}`
                  : `/student/courses/${course.courseId}`;
                return <li key={course.courseId}>
                  <Card className="flex h-full flex-col gap-3 rounded-[20px] p-5">
                    <div>
                      <h3 className="font-extrabold text-dena-deep">{course.title}</h3>
                      <p className="mt-1 text-xs text-dena-muted">
                        جلسه {course.videos.length ? (course.currentIndex + 1).toLocaleString("fa-IR") : "—"} از {course.totalVideos.toLocaleString("fa-IR")}
                      </p>
                    </div>
                    <p className="min-h-6 text-sm text-dena-deep">{course.currentVideo?.title ?? "جلسهٔ آماده‌ای برای نمایش نیست"}</p>
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-dena-border pt-3">
                      <span className="truncate text-xs text-dena-muted">{provider}</span>
                      <Link href={href} className="shrink-0 rounded-lg bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">ادامه</Link>
                    </div>
                  </Card>
                </li>;
              })}
            </ul>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="home-activities" className="rounded-[22px] border border-dena-border bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="home-activities" className="text-lg font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h2>
              <Link href="/student/assessments" className="text-sm font-bold text-dena-brand hover:underline">مشاهده همه تمرین‌ها و آزمون‌ها</Link>
            </div>
            {activityItems.length === 0 ? <p className="mt-5 rounded-xl bg-dena-bg p-4 text-sm text-dena-muted">فعالیت تازه‌ای برای نمایش نیست.</p> : (
              <ul className="mt-4 space-y-3">
                {activityItems.map((item) => <li key={item.id}>
                  <Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl bg-dena-bg px-3 py-2.5">
                    <span className="text-sm font-semibold text-dena-deep">{item.title}</span>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-dena-brand">{item.state}</span>
                  </Link>
                </li>)}
              </ul>
            )}
          </section>

          <section aria-labelledby="home-growth" className="rounded-[22px] border border-dena-border bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="home-growth" className="text-lg font-extrabold text-dena-deep">مسیر رشد من</h2>
              <Link href="/student/growth" className="text-sm font-bold text-dena-brand hover:underline">مشاهده مسیر رشد</Link>
            </div>
            <p className="mt-4 text-sm leading-7 text-dena-deep">
              این هفته: {progress.weeklyMarkedVideos.toLocaleString("fa-IR")} جلسه را خودت تکمیل‌شده علامت زدی / {progress.weeklyAnsweredPractices.toLocaleString("fa-IR")} تمرین پاسخ دادی
            </p>
            <p className="mt-2 text-xs leading-6 text-dena-muted">علامت جلسه خوداظهاری است؛ تماشای کامل یا یادگیری را اثبات نمی‌کند.</p>
            <div className="mt-5 space-y-2">
              <div role="progressbar" aria-label="درصد جلسه‌هایی که در دوره‌های در دسترس خودت تکمیل‌شده علامت زده‌ای" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent(progress.displayedMarkedVideos, progress.displayedReadyVideos)} className="h-2 overflow-hidden rounded-full bg-dena-lavender">
                <div className="h-full rounded-full bg-dena-brand" style={{ width: `${progressPercent(progress.displayedMarkedVideos, progress.displayedReadyVideos)}%` }} />
              </div>
              <p className="text-xs font-semibold text-dena-brand">پیشرفت کلی دوره‌ها</p>
            </div>
          </section>
        </div>

        <section aria-labelledby="elite-club-home" className="rounded-[22px] border border-dena-border bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="elite-club-home" className="text-lg font-extrabold text-dena-deep">باشگاه نخبگان</h2>
            <Link href="/student/elite-club" className="text-sm font-bold text-dena-brand hover:underline">مشاهده باشگاه</Link>
          </div>
          <p className="mt-2 text-sm leading-7 text-dena-muted">با ادامه مسیر یادگیری، وضعیت عضویتت را دنبال کن.</p>
        </section>
      </div>
    </StudentShell>
  );
}
