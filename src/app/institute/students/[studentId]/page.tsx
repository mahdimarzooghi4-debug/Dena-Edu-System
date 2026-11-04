import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteStudentProfile } from "../../../../server/institute/students";
import { getInstituteCourseTeam } from "../../../../server/institute/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پرونده دانش‌آموز | دنا",
  robots: { index: false, follow: false },
};

const roleLabels = {
  teacher: "مدرس",
  academic_supporter: "پشتیبان تحصیلی",
  counselor: "مشاور",
} as const;
const fa = (value: number) => value.toLocaleString("fa-IR");

function dateTime(value: Date) {
  return value.toLocaleString("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function InstituteStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");

  const { studentId } = await params;
  if (!z.uuid().safeParse(studentId).success) notFound();
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const profile = await getInstituteStudentProfile(instituteIds, studentId);
  if (!profile) notFound();

  const teams = await Promise.all(profile.courses.map(async (course) => {
    const members = await getInstituteCourseTeam(actor.userId, course.courseId);
    return [course.courseId, (members ?? []).filter((member) => member.status === "active")] as const;
  }));
  const teamByCourse = new Map(teams);

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div className="flex items-center gap-2 text-sm text-[#767093]">
          <Link href="/institute/students" className="hover:text-[#5b4ce2]">دانش‌آموزان</Link>
          <span aria-hidden="true">/</span>
          <span className="font-bold text-[#2a254b]">{profile.name}</span>
        </div>
        <form action="/institute/students" method="get" role="search"
          className="hidden w-[260px] items-center gap-2 rounded-lg bg-[#f8f7fc] px-3 py-2 sm:flex">
          <span aria-hidden="true" className="text-[#7e7a94]">⌕</span>
          <input name="query" type="search" placeholder="جستجو..."
            aria-label="جست‌وجو دانش‌آموزان"
            className="min-w-0 flex-1 bg-transparent text-right text-sm outline-none placeholder:text-[#7e7a94]" />
        </form>
      </header>

      <div className="space-y-5 p-5 md:p-8">
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#e8e6f0] bg-white p-5 md:p-6">
          <div>
            <p className="text-xs font-bold text-[#5b4ce2]">پروندهٔ دانش‌آموز</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#2a254b]">{profile.name}</h1>
            <p className="mt-2 text-sm text-[#767093]">ثبت‌نام از {profile.enrolledAt.toLocaleDateString("fa-IR")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={profile.status === "active"
              ? "rounded-md bg-[#e6fbf3] px-3 py-1.5 text-xs font-bold text-[#10b981]"
              : "rounded-md bg-[#f2f0f7] px-3 py-1.5 text-xs font-bold text-[#767093]"}>
              {profile.status === "active" ? "فعال" : "غیرفعال"}
            </span>
            <span className="rounded-md bg-[#f8f7fc] px-3 py-1.5 text-xs font-bold text-[#5b4ce2]">
              {fa(profile.courses.length)} دوره ثبت‌نام شده
            </span>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <section className="rounded-xl border border-[#e8e6f0] bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-[#2a254b]">دوره‌ها</h2>
                <span className="text-xs text-[#767093]">وضعیت ثبت‌نام و تکمیل ویدئوها</span>
              </div>
              {profile.courses.length ? (
                <div className="mt-4 space-y-4">
                  {profile.courses.map((course) => {
                    const percent = course.totalVideos
                      ? Math.min(100, Math.round(course.completedVideos / course.totalVideos * 100))
                      : 0;
                    const members = teamByCourse.get(course.courseId) ?? [];
                    return (
                      <article key={course.courseId} className="rounded-lg border border-[#e8e6f0] bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-[#2a254b]">{course.title}</h3>
                            <p className="mt-1 text-xs text-[#767093]">ثبت‌نام از {course.enrolledAt.toLocaleDateString("fa-IR")}</p>
                          </div>
                          <span className={course.status === "active"
                            ? "rounded-md bg-[#e6fbf3] px-2.5 py-1 text-[11px] font-semibold text-[#10b981]"
                            : "rounded-md bg-[#f2f0f7] px-2.5 py-1 text-[11px] font-semibold text-[#767093]"}>
                            {course.status === "active" ? "فعال" : "غیرفعال"}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#2a254b]">میزان تکمیل ویدئوها</span>
                            <span className="text-[#767093]">
                              {course.totalVideos
                                ? `${fa(course.completedVideos)} از ${fa(course.totalVideos)} ویدئو · ${fa(percent)}٪`
                                : "ویدئوی آماده‌ای برای این دوره ثبت نشده"}
                            </span>
                          </div>
                          {course.totalVideos > 0 && (
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeaf7]" role="progressbar"
                              aria-label={`تکمیل ویدئوهای ${course.title}`}
                              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                              <div className="h-full rounded-full bg-[#5b4ce2] transition-all" style={{ width: `${percent}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="mt-4 border-t border-[#e8e6f0] pt-3">
                          <h4 className="text-xs font-bold text-[#2a254b]">تیم آموزشی دوره</h4>
                          {members.length ? (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {members.map((member) => (
                                <li key={member.teamMemberId} className="rounded-md bg-[#f8f7fc] px-3 py-1.5 text-xs text-[#2a254b]">
                                  {member.name}<span className="mx-1 text-[#aaa6b8]">·</span>{roleLabels[member.role]}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-[#767093]">برای این دوره عضو فعالی در تیم آموزشی ثبت نشده است.</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-[#f8f7fc] p-4 text-sm text-[#767093]">دوره‌ای برای این دانش‌آموز ثبت نشده است.</p>
              )}
            </section>

            <section className="rounded-xl border border-[#e8e6f0] bg-white p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-[#2a254b]">فعالیت‌ها (پیش‌نمایش)</h2>
                <span className="text-xs text-[#767093]">فقط رویدادهای آموزشی ثبت‌شده</span>
              </div>
              {profile.activities.length ? (
                <ol className="mt-3 divide-y divide-[#e8e6f0]">
                  {profile.activities.map((activity, index) => (
                    <li key={`${activity.kind}-${activity.occurredAt.toISOString()}-${index}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#2a254b]">
                          {activity.kind === "video" ? "مشاهده ویدیوی آموزشی" : "ثبت پاسخ آزمون"} «{activity.title}»
                        </p>
                        <p className="mt-1 text-xs text-[#767093]">{activity.courseTitle}</p>
                      </div>
                      <time dateTime={activity.occurredAt.toISOString()} className="text-xs text-[#767093]">
                        {dateTime(activity.occurredAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 rounded-lg bg-[#f8f7fc] p-4 text-sm leading-7 text-[#767093]">
                  هنوز فعالیت آموزشی برای نمایش ثبت نشده است.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-xl border border-[#e8e6f0] bg-white p-5 md:p-6">
              <h2 className="text-lg font-extrabold text-[#2a254b]">اطلاعات دانش‌آموز</h2>
              <dl className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-[#767093]">نام دانش‌آموز</dt>
                  <dd className="text-sm font-bold text-[#2a254b]">{profile.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-[#767093]">وضعیت</dt>
                  <dd className="text-sm font-bold text-[#2a254b]">{profile.status === "active" ? "فعال" : "غیرفعال"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-[#767093]">تعداد دوره‌ها</dt>
                  <dd className="text-sm font-bold text-[#2a254b]">{fa(profile.courses.length)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-[#767093]">تاریخ اولین ثبت‌نام</dt>
                  <dd className="text-sm font-bold text-[#2a254b]">{profile.enrolledAt.toLocaleDateString("fa-IR")}</dd>
                </div>
              </dl>
            </section>
            <section className="rounded-xl border border-[#e8e6f0] bg-white p-5 md:p-6">
              <h2 className="text-lg font-extrabold text-[#2a254b]">روند یادگیری</h2>
              <p className="mt-3 text-sm leading-7 text-[#767093]">
                روند زمانی رشد و میانگین سرعت مشاهده ویدئو در مدل فعلی ذخیره نمی‌شود؛ این بخش فقط تکمیل ویدئو را بر پایهٔ داده‌های ثبت‌شده نشان می‌دهد.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
