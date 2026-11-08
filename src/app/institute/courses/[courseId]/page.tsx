import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { buttonClassName } from "../../../../components/ui/button";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteCourseDetail } from "../../../../server/institute/course-detail";
import { getInstituteCourseTeam } from "../../../../server/institute/course-team";
import { CourseTeamSessionPolicyControl } from "../../../../components/institute/course-team-controls";
import { AiVideoPermissions } from "../../../../components/institute/ai-video-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "وضعیت دورهٔ مؤسسه | دنا",
  robots: { index: false, follow: false },
};
const supervisionLabels = {
  requested: "در انتظار تصمیم مستقل مؤسسه",
  approved: "نظارت همین دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "هنوز ثبت نشده",
  pending: "در انتظار بازبینی مستقل سؤال",
  approved: "تأییدشده برای نمایش به دانش‌آموز",
  rejected: "ردشده و از دانش‌آموز پنهان",
} as const;

export default async function InstituteCoursePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const scopes = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  const course = await getInstituteCourseDetail(scopes, courseId);
  if (!course) notFound();
  const team = await getInstituteCourseTeam(actor.userId, courseId);
  if (!team) notFound();

  const teamRoleLabel = {
    teacher: "مدرس",
    academic_supporter: "پشتیبان تحصیلی",
    counselor: "مشاور",
  } as const;

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs text-[#7e7a94]">
            <Link href="/institute/courses" className="hover:text-[#5b4ce2]">دوره‌ها</Link>
            <span aria-hidden="true"> &gt; </span>{course.title}
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">جزئیات دوره</h1>
        </div>
        <div className="flex items-center gap-3">
          <form action="/institute/courses" method="get" role="search" className="hidden w-[280px] items-center gap-2 rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 sm:flex">
            <span aria-hidden="true" className="text-[#7e7a94]">⌕</span>
            <input name="query" type="search" aria-label="جست‌وجو در دوره‌ها" placeholder="جستجو..." className="min-w-0 flex-1 bg-transparent text-right text-sm outline-none placeholder:text-[#7e7a94]" />
          </form>
          <Link href="/account" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">حساب من</Link>
        </div>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6" aria-label="خلاصه دوره">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold text-[#5b4ce2]">پروندهٔ دوره</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-10 text-[#1e1a33]">{course.title}</h2>
            </div>
            <Link href={`/institute/courses/${courseId}/edit`}
              className="rounded-lg bg-[#5b4ce2] px-4 py-2 text-sm font-bold text-white hover:bg-[#493bc7]">ویرایش دوره</Link>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-[#f8f7fc] p-4">
              <dt className="text-xs text-[#7e7a94]">وضعیت نظارت</dt>
              <dd className="mt-2 text-sm font-bold text-[#1e1a33]">{supervisionLabels[course.supervisionStatus]}</dd>
            </div>
            <div className="rounded-lg bg-[#f8f7fc] p-4">
              <dt className="text-xs text-[#7e7a94]">ثبت‌نام‌های فعال</dt>
              <dd className="mt-2 text-lg font-extrabold text-[#5b4ce2]">{course.activeEnrollmentCount.toLocaleString("fa-IR")}</dd>
            </div>
            <div className="rounded-lg bg-[#f8f7fc] p-4">
              <dt className="text-xs text-[#7e7a94]">مدرس / ارائه‌دهنده</dt>
              <dd className="mt-2 text-sm font-bold text-[#1e1a33]">{course.providerName ?? course.independentEducatorName ?? "مؤسسهٔ مسئول"}</dd>
            </div>
            <div className="rounded-lg bg-[#f8f7fc] p-4">
              <dt className="text-xs text-[#7e7a94]">ویدئوهای آماده</dt>
              <dd className="mt-2 text-lg font-extrabold text-[#5b4ce2]">{course.readyVideos.toLocaleString("fa-IR")}</dd>
            </div>
          </dl>
        </section>

        <nav aria-label="بخش‌های دوره" className="overflow-x-auto rounded-xl border border-[#e5e1ed] bg-white">
          <div className="flex min-w-max items-center gap-1 p-2 text-sm">
            <span aria-current="page" className="rounded-lg bg-[#eeeaff] px-4 py-3 font-bold text-[#5b4ce2]">نمای کلی</span>
            <Link href={`/institute/courses/${courseId}/assessments`} className="rounded-lg px-4 py-3 text-[#7e7a94] hover:bg-[#f8f7fc]">آزمون‌های یادگیری</Link>
            <Link href={`/institute/sessions?courseId=${courseId}`} className="rounded-lg px-4 py-3 text-[#7e7a94] hover:bg-[#f8f7fc]">جلسات و محتوا</Link>
            <span aria-disabled="true" title="فهرست دانش‌آموزان دوره هنوز در مخزن پیاده‌سازی نشده است" className="cursor-not-allowed px-4 py-3 text-[#aaa6b8]">دانش‌آموزان</span>
            <a href="#institute-course-team" className="rounded-lg px-4 py-3 text-[#7e7a94] hover:bg-[#f8f7fc]">تیم آموزشی</a>
          </div>
        </nav>

        <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6" aria-labelledby="course-description">
          <h2 id="course-description" className="text-base font-extrabold text-[#1e1a33]">توضیحات دوره</h2>
          <p className="mt-3 text-sm leading-8 text-[#7e7a94]">
            برای این دوره توضیحات متنی در اطلاعات فعلی ثبت نشده است.
          </p>
          <dl className="mt-5 grid gap-4 border-t border-[#e5e1ed] pt-5 sm:grid-cols-2 xl:grid-cols-3">
            <div><dt className="text-xs text-[#7e7a94]">تاریخ درخواست نظارت</dt><dd className="mt-1 text-sm font-bold text-[#1e1a33]">{course.requestedAt.toLocaleDateString("fa-IR")}</dd></div>
            <div><dt className="text-xs text-[#7e7a94]">محتوای آماده</dt><dd className="mt-1 text-sm font-bold text-[#1e1a33]">{course.readyVideos.toLocaleString("fa-IR")} ویدئو</dd></div>
            <div><dt className="text-xs text-[#7e7a94]">مسئول آموزشی</dt><dd className="mt-1 text-sm font-bold text-[#1e1a33]">{course.providerName ?? course.independentEducatorName ?? "مؤسسهٔ مسئول"}</dd></div>
          </dl>
        </section>

        {course.supervisionStatus === "requested" ? (
          <section className="space-y-3 rounded-xl border border-[#e5e1ed] bg-white p-5" aria-label="اقدام‌های مؤسسه">
            <p className="text-sm leading-8 text-[#7e7a94]">درخواست نظارت همین دوره در انتظار تصمیم مستقل مؤسسه است.</p>
            <Link href="/institute/providers" className={buttonClassName()}>رفتن به صف بررسی نظارت</Link>
          </section>
        ) : course.supervisionStatus === "approved" ? (
          <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6" aria-label="اقدام‌های مؤسسه">
            <p className="mb-4 text-sm leading-8 text-[#7e7a94]">
              بازبینی سؤال تمرینی، مستقل از تأیید نظارت دوره است؛ نمایندهٔ هم‌زمانِ ارائه‌دهندهٔ همین دوره مجوز این تصمیم را ندارد.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/institute/courses/${course.courseId}/practice`} className={buttonClassName("secondary")}>مشاهده و بررسی مستقل سؤال تمرینی</Link>
              <Link href={`/institute/courses/${course.courseId}/assessments`} className={buttonClassName("secondary")}>بازبینی مستقل ارزیابی یادگیری</Link>
              <Link href="/institute/providers" className={buttonClassName()}>مدیریت تصمیم نظارت</Link>
            </div>
          </section>
        ) : (
          <p role="status" className="rounded-xl bg-white p-4 text-sm leading-8 text-[#7e7a94]">
            نظارت همین دوره رد یا لغو شده است؛ بازبینی سؤال و دسترسی دانش‌آموز از این صفحه فعال نمی‌شوند.
          </p>
        )}

        <AiVideoPermissions
          courseId={courseId}
          grantEligible={course.supervisionStatus === "approved" &&
            (course.ownerType === "institute" || course.ownerType === "independent_educator")}
        />

        <section id="institute-course-team" aria-labelledby="institute-course-team-title" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5e1ed] p-5 md:p-6">
            <h2 id="institute-course-team-title" className="text-base font-extrabold text-[#5b4ce2]">تیم آموزشی دوره</h2>
            <Link href="#institute-course-team" className={buttonClassName("secondary")}>مدیریت تیم آموزشی</Link>
          </div>
          <p className="px-5 py-3 text-xs leading-6 text-[#7e7a94]">نقش‌ها فقط به همین دوره متصل‌اند و نقش سراسری در دنا ایجاد نمی‌کنند.</p>
          {team.length === 0 ? (
            <p className="p-5 text-sm text-[#7e7a94]">هنوز عضوی برای تیم آموزشی این دوره ثبت نشده است.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] text-right text-sm">
                  <thead className="bg-[#f8f7fc] text-xs text-[#7e7a94]"><tr>
                    <th className="px-4 py-3 font-bold">نام</th><th className="px-4 py-3 font-bold">نقش</th><th className="px-4 py-3 font-bold">وضعیت</th><th className="px-4 py-3 font-bold">عملیات</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#e5e1ed] text-[#1e1a33]">
                    {team.map((member) => <tr key={member.teamMemberId}>
                      <td className="px-4 py-4 font-bold">{member.name}</td>
                      <td className="px-4 py-4">{teamRoleLabel[member.role]}</td>
                      <td className="px-4 py-4"><span className={member.status === "active" ? "rounded bg-[#e6f7f0] px-2 py-1 text-xs font-bold text-[#24845a]" : "rounded bg-[#f8f7fc] px-2 py-1 text-xs text-[#7e7a94]"}>{member.status === "active" ? "فعال" : "پایان‌یافته"}</span></td>
                      <td className="px-4 py-4">
                        {member.role === "academic_supporter" && member.status === "active"
                          ? <CourseTeamSessionPolicyControl courseId={courseId} teamMemberId={member.teamMemberId} enabled={member.studentSessionRequestsEnabled} />
                          : <span className="text-xs text-[#7e7a94]">—</span>}
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 p-4 md:hidden">
                {team.map((member) => <li key={member.teamMemberId}>
                  <Card className="space-y-2">
                    <h3 className="font-extrabold">{member.name}</h3>
                    <p className="text-sm text-[#7e7a94]">{teamRoleLabel[member.role]}</p>
                    <p className="text-xs">{member.status === "active" ? "فعال" : "پایان‌یافته"}</p>
                    {member.role === "academic_supporter" && member.status === "active" && <CourseTeamSessionPolicyControl courseId={courseId} teamMemberId={member.teamMemberId} enabled={member.studentSessionRequestsEnabled} />}
                  </Card>
                </li>)}
              </ul>
            </>
          )}
        </section>
        <p className="text-xs leading-7 text-[#7e7a94]">
          هیچ نتیجه، هویت یا یادداشت خصوصی دانش‌آموز در این نما نیست؛ تأیید داخلی دنا جایگزین مجوز رسمی آموزشی نیست.
        </p>
      </div>
    </main>
  );
}
