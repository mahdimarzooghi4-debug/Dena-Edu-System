import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../../server/access/actor";
import { z } from "zod";
import { getInstituteInstructorDetail } from "../../../../server/institute/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "جزئیات مدرس | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

const fa = (value: number) => value.toLocaleString("fa-IR");
const shortId = (id: string) => id.slice(0, 8).toUpperCase();

export default async function InstituteInstructorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamMemberId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const [{ teamMemberId }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(teamMemberId).success) notFound();
  const detail = await getInstituteInstructorDetail(instituteIds, teamMemberId);
  if (!detail) notFound();
  const tab = query.tab === "recordings" ? "recordings" : "courses";
  const recordingCountByCourse = new Map<string, number>();
  for (const recording of detail.recordings) {
    recordingCountByCourse.set(recording.courseId,
      (recordingCountByCourse.get(recording.courseId) ?? 0) + 1);
  }

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f7f6fb]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <form action="/institute/instructors" method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg border border-[#e5e1ed] px-3 py-2">
          <input name="query" type="search" placeholder="جستجو..." aria-label="جست‌وجوی مدرس"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
          <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
        </form>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/institute/instructors" className="text-[#8b86a3] hover:text-[#5b4ce2]">مدرس‌ها</Link>
          <span className="text-[#8b86a3]" aria-hidden="true">‹</span>
          <span className="font-semibold text-[#5b4ce2]">{detail.name}</span>
        </div>
      </header>

      <div className="space-y-5 p-5 md:p-8">
        <section aria-label="خلاصه مدرس"
          className="flex flex-col gap-5 rounded-xl border border-[#e5e1ed] bg-white p-5 md:flex-row md:items-center md:gap-6 md:p-6">
          <div aria-hidden="true"
            className="grid size-20 shrink-0 place-items-center self-end rounded-full bg-[#eceaf5] text-2xl font-bold text-[#5b4ce2] md:self-auto">
            {detail.name.trim().slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-right">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-[#1e1a33]">{detail.name}</h1>
              <span className={detail.active
                ? "rounded-md bg-[#e8fff3] px-2.5 py-1 text-xs font-semibold text-[#10b981]"
                : "rounded-md bg-[#f2f0f7] px-2.5 py-1 text-xs font-semibold text-[#767093]"}>
                {detail.active ? "فعال" : "پایان‌یافته"}
              </span>
            </div>
            <p className="text-sm text-[#6e6a8a]">مدرس دوره‌های آموزشی</p>
            <p className="text-xs text-[#8b86a3]">
              تاریخ انتساب به تیم: {detail.assignedAt.toLocaleDateString("fa-IR")}
            </p>
          </div>
        </section>

        <nav aria-label="بخش‌های جزئیات مدرس" className="flex gap-1 border-b border-[#e5e1ed] pb-1">
          <Link href={`/institute/instructors/${teamMemberId}?tab=courses`}
            aria-current={tab === "courses" ? "page" : undefined}
            className={tab === "courses"
              ? "border-b-2 border-[#5b4ce2] px-4 py-2 text-sm font-bold text-[#5b4ce2]"
              : "px-4 py-2 text-sm text-[#8b86a3] hover:text-[#5b4ce2]"}>
            دوره‌های آموزشی
          </Link>
          <Link href={`/institute/instructors/${teamMemberId}?tab=recordings`}
            aria-current={tab === "recordings" ? "page" : undefined}
            className={tab === "recordings"
              ? "border-b-2 border-[#5b4ce2] px-4 py-2 text-sm font-bold text-[#5b4ce2]"
              : "px-4 py-2 text-sm text-[#8b86a3] hover:text-[#5b4ce2]"}>
            جلسات ضبط‌شده
          </Link>
        </nav>

        {tab === "courses" ? (
          <section aria-label="دوره‌های آموزشی مدرس"
            className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
            {detail.courses.length ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[800px] text-right text-sm">
                    <thead className="bg-[#f9fafb] text-[13px] font-bold text-[#1e1a33]">
                      <tr>
                        <th scope="col" className="w-[120px] px-4 py-4">شناسه دوره</th>
                        <th scope="col" className="px-4 py-4">عنوان دوره</th>
                        <th scope="col" className="w-[170px] px-4 py-4">مقطع تحصیلی</th>
                        <th scope="col" className="w-[150px] px-4 py-4">دانش‌آموزان فعال</th>
                        <th scope="col" className="w-[150px] px-4 py-4">ویدئوهای آماده</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e1ed] text-[#1e1a33]">
                      {detail.courses.map((course) => (
                        <tr key={course.teamMemberId}>
                          <td className="px-4 py-4 text-xs text-[#6e6a8a]">{shortId(course.courseId)}</td>
                          <td className="px-4 py-4">
                            <Link href={`/institute/courses/${course.courseId}`}
                              className="font-semibold text-[#5b4ce2] hover:underline">{course.title}</Link>
                            {!course.active && <span className="mr-2 text-xs text-[#8b86a3]">انتساب پایان‌یافته</span>}
                          </td>
                          <td className="px-4 py-4 text-[#8b86a3]">در داده‌های دوره ثبت نشده</td>
                          <td className="px-4 py-4">{fa(course.activeStudents)}</td>
                          <td className="px-4 py-4">{fa(recordingCountByCourse.get(course.courseId) ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-[#e5e1ed] md:hidden">
                  {detail.courses.map((course) => (
                    <li key={course.teamMemberId} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/institute/courses/${course.courseId}`}
                          className="font-bold text-[#5b4ce2]">{course.title}</Link>
                        <span className="text-xs text-[#8b86a3]">{shortId(course.courseId)}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-xs">
                        <div><dt className="text-[#8b86a3]">دانش‌آموزان فعال</dt><dd className="mt-1 font-bold">{fa(course.activeStudents)}</dd></div>
                        <div><dt className="text-[#8b86a3]">ویدئوهای آماده</dt><dd className="mt-1 font-bold">{fa(recordingCountByCourse.get(course.courseId) ?? 0)}</dd></div>
                        <div className="col-span-2"><dt className="text-[#8b86a3]">مقطع تحصیلی</dt><dd className="mt-1">در داده‌های دوره ثبت نشده</dd></div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="p-8 text-center text-sm text-[#8b86a3]">دورهٔ تأییدشده‌ای برای این مدرس در دسترس نیست.</p>
            )}
          </section>
        ) : (
          <section aria-label="ویدئوهای آماده دوره‌های مدرس"
            className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
            {detail.recordings.length ? (
              <ul className="divide-y divide-[#e5e1ed]">
                {detail.recordings.map((recording) => (
                  <li key={recording.assetId} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between md:px-5">
                    <div>
                      <h2 className="font-semibold text-[#1e1a33]">{recording.title}</h2>
                      <Link href={`/institute/courses/${recording.courseId}`}
                        className="mt-1 inline-block text-sm text-[#5b4ce2] hover:underline">{recording.courseTitle}</Link>
                    </div>
                    <time dateTime={recording.createdAt.toISOString()} className="text-xs text-[#8b86a3]">
                      {recording.createdAt.toLocaleDateString("fa-IR")}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-8 text-center text-sm leading-7 text-[#8b86a3]">
                ویدئوی آماده‌ای برای دوره‌های این مدرس ثبت نشده است.
              </p>
            )}
          </section>
        )}

        <p role="note" className="text-xs leading-6 text-[#8b86a3]">
          مقطع تحصیلی، مدت دوره و آخرین ورود مدرس در داده‌های فعلی ثبت نمی‌شوند. تب جلسات ضبط‌شده، ویدئوهای آمادهٔ همان دوره‌ها را نشان می‌دهد و به‌تنهایی مالکیت ضبط را به مدرس نسبت نمی‌دهد.
        </p>
        <div className="flex justify-start">
          <Link href="/institute/instructors" className="text-sm font-semibold text-[#5b4ce2] hover:underline">بازگشت به فهرست مدرس‌ها</Link>
        </div>
      </div>
    </main>
  );
}
