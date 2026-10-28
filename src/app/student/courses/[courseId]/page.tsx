import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { buttonClassName } from "../../../../components/ui/button";
import { CourseDetailAction } from "../../../../components/student/course-detail-action";
import { VerificationBadge } from "../../../../components/ui/verification-badge";
import { StudentShell } from "../../../../components/student/student-shell";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getStudentCourseDetail } from "../../../../server/student/course-detail";
import { getStudentCourseTeam } from "../../../../server/student/course-team";
import { getStudentVideoProgress } from "../../../../server/student/video-progress";
import { getStudentProgressOverview } from "../../../../server/student/progress-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "جزئیات دوره | دنا",
  robots: { index: false, follow: false },
};

function EnrollmentBadge({
  status,
}: {
  status: "active" | "cancelled" | null;
}) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        ثبت‌نام فعال
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        ثبت‌نام لغوشده
      </span>
    );
  }
  return (
    <span className="rounded-full bg-dena-bg px-3 py-1 text-xs font-bold text-dena-muted">
      هنوز ثبت‌نام نشده
    </span>
  );
}

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
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

  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();

  const detail = await getStudentCourseDetail(actor.userId, courseId);
  if (!detail) notFound();

  const enrolled = detail.enrollmentStatus === "active";
  const [team, videos, progressOverview] = enrolled
    ? await Promise.all([
      getStudentCourseTeam(actor.userId, courseId),
      getStudentVideoProgress(actor.userId, courseId),
      getStudentProgressOverview(actor.userId),
    ]).then(([members, readyVideos, overview]) => [members ?? [], readyVideos, overview] as const)
    : [[], [], null] as const;
  const courseProgress = progressOverview?.courses.find((course) => course.courseId === courseId);
  const completedVideos = videos.filter((video) => video.completed).length;
  const videoProgress = videos.length ? Math.round(completedVideos / videos.length * 100) : 0;

  return (
    <StudentShell active="courses" title="جزئیات دوره">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/student/courses"
            className="text-sm font-bold text-dena-brand hover:underline"
          >
            بازگشت به دوره‌های من
          </Link>
          <EnrollmentBadge status={detail.enrollmentStatus} />
        </div>

        <Card className="rounded-[22px] p-6 md:p-8">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-dena-brand">دوره آموزشی</p>
              <h2 className="text-2xl font-extrabold leading-10 text-dena-ink md:text-3xl">
                {detail.title}
              </h2>
              <div className="flex flex-col gap-3 text-xs text-dena-muted">
                <div className="flex flex-wrap items-center gap-2">
                  {detail.providerName
                    ? <><span>ارائه‌دهنده: {detail.providerName}</span>
                        {detail.providerCollaborationApproved && <VerificationBadge kind="provider" />}</>
                    : detail.ownerType === "independent_educator"
                      ? <><span>{detail.independentEducatorName}</span>
                          <VerificationBadge kind="independent-educator" /></>
                      : <span>مالک دوره: مؤسسهٔ مسئول</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span>مؤسسهٔ مسئول: {detail.responsibleInstituteName}</span>
                  <VerificationBadge kind="institute" />
                </div>
                <p className="text-[11px] leading-6">نشان مؤسسه به معنی مجوز رسمی فعالیت آموزشی نیست؛ تأیید نظارت هر دوره جداگانه نمایش داده می‌شود.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-dena-bg p-5">
                <p className="text-xs font-medium text-dena-muted">محتوای آماده فعلی</p>
                <p className="mt-2 text-2xl font-extrabold text-dena-deep">
                  {detail.readyVideoCount.toLocaleString("fa-IR")} ویدئو
                </p>
                <p className="mt-2 text-xs leading-6 text-dena-muted">
                  فقط محتوایی که همچنان آماده و مجاز است در شمارش قرار می‌گیرد.
                </p>
              </div>
              <div className="rounded-2xl bg-dena-bg p-5">
                <p className="text-xs font-medium text-dena-muted">وضعیت دسترسی</p>
                <p className="mt-2 text-lg font-extrabold text-dena-deep">
                  {enrolled ? "قابل ادامه" : "نیازمند ثبت‌نام"}
                </p>
                <p className="mt-2 text-xs leading-6 text-dena-muted">
                  دسترسی دانش‌آموز در هر درخواست دوباره با وضعیت انتشار و نظارت دوره بررسی می‌شود.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CourseDetailAction
                courseId={detail.courseId}
                enrollmentStatus={detail.enrollmentStatus}
              />
              {enrolled && (
                <Link
                  href="/student/progress"
                  className={buttonClassName("outline")}
                >
                  مشاهده پیگیری یادگیری
                </Link>
              )}
            </div>
          </div>
        </Card>

        {enrolled && (
          <>
            <Card className="space-y-4 rounded-[22px] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-extrabold text-dena-deep">خلاصه پیشرفت</h2>
                <span className="text-sm font-bold text-dena-brand">{videoProgress.toLocaleString("fa-IR")}٪</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-dena-lavender" role="progressbar"
                aria-label="نسبت جلساتی که خود دانش‌آموز تکمیل‌شده علامت زده است"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={videoProgress}>
                <div className="h-full rounded-full bg-dena-mint" style={{ width: `${videoProgress}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-dena-muted">
                <span>{completedVideos.toLocaleString("fa-IR")} جلسه تکمیل‌شده</span>
                <span>{videos.length.toLocaleString("fa-IR")} جلسهٔ آماده</span>
              </div>
              <p className="text-xs leading-6 text-dena-muted">
                درصد پیشرفت بر پایهٔ علامت‌های اختیاری خودت است و اثبات تماشا یا نمرهٔ رسمی نیست.
              </p>
              {videos[0] && <Link href={`/student/courses/${courseId}/watch?video=${encodeURIComponent(videos.find((video) => !video.completed)?.assetId ?? videos[0].assetId)}`}
                className={buttonClassName()}>
                ادامه یادگیری
              </Link>}
            </Card>

            <section aria-labelledby="course-assessments-title" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="course-assessments-title" className="text-lg font-extrabold text-dena-deep">تمرین‌ها و آزمون‌های این دوره</h2>
                  <p className="mt-1 text-sm text-dena-muted">فعالیت‌های آموزشی مرتبط را دنبال کن.</p>
                </div>
                <Link href="/student/assessments" className="text-sm font-bold text-dena-brand hover:underline">
                  مشاهده همه
                </Link>
              </div>
              <Card className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-5">
                <div>
                  <p className="font-bold text-dena-ink">
                    {courseProgress?.practice.state === "answered" ? "تمرین انجام‌شده" :
                      courseProgress?.practice.state === "not_attempted" ? "تمرین آماده انجام" :
                        "تمرین یا آزمون دوره"}
                  </p>
                  <p className="mt-2 text-sm text-dena-muted">
                    {courseProgress?.practice.state === "answered" ? "پاسخ تمرین در حساب خودت ثبت شده است." :
                      courseProgress?.practice.state === "not_attempted" ? "تمرین تأییدشده در انتظار پاسخ توست." :
                        "تمرین و آزمون‌های منتشرشده را در فهرست فعالیت‌ها ببین."}
                  </p>
                </div>
                <Link href="/student/assessments" className={buttonClassName("outline")}>رفتن به فعالیت‌ها</Link>
              </Card>
            </section>

            <section aria-labelledby="course-content-title" className="space-y-3">
              <div>
                <h2 id="course-content-title" className="text-lg font-extrabold text-dena-deep">محتوای دوره</h2>
                <p className="mt-1 text-sm text-dena-muted">جلسه‌های آماده و مجاز همین دوره.</p>
              </div>
              {videos.length === 0 ? (
                <Card className="rounded-[18px] p-5 text-sm leading-7 text-dena-muted">
                  جلسهٔ آماده‌ای برای نمایش وجود ندارد.
                </Card>
              ) : (
                <ol className="space-y-2">
                  {videos.map((video, index) => (
                    <li key={video.assetId}>
                      <Link href={`/student/courses/${courseId}/watch?video=${encodeURIComponent(video.assetId)}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-dena-border bg-white p-4 transition hover:border-dena-brand">
                        <span>
                          <span className="block text-xs text-dena-muted">
                            {video.completed ? "تکمیل‌شده" : index === videos.findIndex((item) => !item.completed) ? "جلسه جاری" : "شروع‌نشده"}
                          </span>
                          <span className="mt-1 block font-bold text-dena-ink">
                            جلسهٔ {(index + 1).toLocaleString("fa-IR")} — {video.title}
                          </span>
                        </span>
                        <span className="text-sm font-bold text-dena-brand">مشاهده جلسه ←</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>

          <section aria-labelledby="course-team-title" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="course-team-title" className="text-xl font-extrabold">
                  تیم آموزشی دوره
                </h2>
                <p className="mt-1 text-sm leading-7 text-dena-muted">
                  مدرس، پشتیبان تحصیلی و مشاور فقط در صورت تخصیص واقعی به همین دوره نمایش داده می‌شوند.
                </p>
              </div>
              <Link
                href={`/student/courses/${courseId}/conversations`}
                className={buttonClassName("outline")}
              >
                گفت‌وگوهای دوره
              </Link>
            </div>
            {team.length === 0 ? (
              <Card className="rounded-[22px] p-6">
                <p className="text-sm font-bold text-dena-ink">
                  هنوز عضو دیگری برای تیم آموزشی این دوره ثبت نشده است.
                </p>
                <p className="mt-2 text-sm leading-7 text-dena-muted">
                  هر عضو فقط پس از تخصیص مؤسسه مسئول و در محدوده همین دوره نمایش داده می‌شود.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {team.map((member) => {
                  const roleLabel =
                    member.role === "teacher"
                      ? "مدرس"
                      : member.role === "academic_supporter"
                        ? "پشتیبان تحصیلی"
                        : "مشاور";
                  return (
                    <Link
                      key={member.teamMemberId}
                      href={`/student/courses/${courseId}/team/${member.teamMemberId}`}
                      className="rounded-[22px] border border-dena-border bg-white p-5 transition hover:border-dena-brand hover:shadow-sm"
                    >
                      <p className="text-xs font-bold text-dena-brand">
                        {roleLabel}
                      </p>
                      <h3 className="mt-2 text-lg font-extrabold text-dena-ink">
                        {member.name}
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-dena-muted">
                        ارتباط فقط در چارچوب همین دوره انجام می‌شود.
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <Card className="rounded-[22px] border-dashed p-5">
          <p className="text-xs leading-7 text-dena-muted">
            دنا زیرساخت فنی این دسترسی است. مسئولیت محتوای آموزشی و خدمات مرتبط با دوره بر عهده مؤسسه یا ارائه‌دهنده مسئول همان دوره است.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
