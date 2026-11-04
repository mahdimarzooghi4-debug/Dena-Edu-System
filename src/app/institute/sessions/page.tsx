import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteDashboardCourses, getInstituteCourseSessionAssets } from "../../../server/institute/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "جلسات و محتوا | دنا",
  robots: { index: false, follow: false },
};

const assetStatusLabel = {
  ready: "بارگذاری شده",
  withdrawn: "برداشته‌شده",
} as const;

export default async function InstituteSessionsPage({
  searchParams,
}: { searchParams: Promise<{ courseId?: string; query?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const { courseId: requestedCourseId, query: rawQuery } = await searchParams;
  const query = rawQuery?.trim() ?? "";
  const result = await getInstituteDashboardCourses(instituteIds);
  const availableCourses = result.courses;
  const selectedCourseId = requestedCourseId ?? availableCourses[0]?.courseId;
  if (requestedCourseId && !availableCourses.some((course) =>
    course.courseId === requestedCourseId)) notFound();
  const selectedCourse = availableCourses.find((course) =>
    course.courseId === selectedCourseId);
  const assets = selectedCourse
    ? await getInstituteCourseSessionAssets(instituteIds, selectedCourse.courseId)
    : [];
  const visibleAssets = assets.filter((asset) =>
    !query || asset.title.toLocaleLowerCase("fa-IR")
      .includes(query.toLocaleLowerCase("fa-IR")));

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <h1 className="text-xl font-extrabold text-[#1e1a33]">جلسات و محتوا</h1>
        <Link href="/account" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">حساب من</Link>
      </header>

      <div className="space-y-5 p-5 md:p-8">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="course-select" className="text-sm text-[#7e7a94]">انتخاب دوره:</label>
            {selectedCourse ? (
              <form action="/institute/sessions" method="get" className="flex items-center gap-2">
                <select id="course-select" name="courseId" defaultValue={selectedCourse.courseId}
                  className="min-h-10 max-w-full rounded-lg border border-[#e5e1ed] bg-white px-4 text-sm font-bold text-[#1e1a33]">
                  {availableCourses.map((course) => <option key={course.courseId} value={course.courseId}>{course.title}</option>)}
                </select>
                <button type="submit" className="rounded-lg border border-[#e5e1ed] px-3 py-2 text-sm font-bold text-[#1e1a33] hover:bg-[#f8f7fc]">نمایش</button>
              </form>
            ) : (
              <span className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-2 text-sm text-[#7e7a94]">دوره‌ای در دسترس نیست</span>
            )}
          </div>
          <button type="button" disabled title="ثبت جلسه هنوز در API پنل مؤسسه پیاده‌سازی نشده است"
            className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-[#5b4ce2]/50 px-4 py-2 text-sm font-bold text-white">
            افزودن جلسه
          </button>
        </section>

        <form action="/institute/sessions" method="get" role="search" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e1ed] bg-white p-4">
          {selectedCourse && <input type="hidden" name="courseId" value={selectedCourse.courseId} />}
          <label htmlFor="session-query" className="text-sm font-bold text-[#1e1a33]">جست‌وجو در محتوا</label>
          <input id="session-query" name="query" type="search" defaultValue={query}
            placeholder="عنوان محتوا..." className="min-h-10 min-w-[220px] flex-1 rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right text-sm placeholder:text-[#7e7a94]" />
          <button type="submit" className="rounded-lg border border-[#e5e1ed] px-4 py-2 text-sm font-bold text-[#1e1a33] hover:bg-[#f8f7fc]">جست‌وجو</button>
        </form>

        <section aria-label="فهرست جلسات و محتوا" className="space-y-3 rounded-xl border border-[#e5e1ed] bg-white p-4 md:p-6">
          {selectedCourse ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5e1ed] pb-4">
                <div>
                  <h2 className="font-extrabold text-[#1e1a33]">{selectedCourse.title}</h2>
                  <p className="mt-1 text-xs text-[#7e7a94]">محتوای ویدئویی ثبت‌شده برای این دوره</p>
                </div>
                <span className="rounded-lg bg-[#f8f7fc] px-3 py-2 text-xs text-[#7e7a94]">{visibleAssets.length.toLocaleString("fa-IR")} ویدئو</span>
              </div>
              {visibleAssets.length ? (
                <ol className="space-y-3">
                  {visibleAssets.map((asset, index) => (
                    <li key={asset.assetId} className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#f8f7fc] p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <span className="shrink-0 text-sm font-bold text-[#5b4ce2]">جلسه { (index + 1).toLocaleString("fa-IR") }</span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-[#1e1a33]">{asset.title}</h3>
                          <p className="mt-1 text-xs text-[#7e7a94]">ارزیابی جداگانه‌ای برای این جلسه ثبت نشده است.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={asset.status === "ready" ? "rounded bg-[#e6f7f0] px-2 py-1 text-xs font-bold text-[#10b981]" : "rounded bg-[#f8f7fc] px-2 py-1 text-xs font-bold text-[#7e7a94]"}>
                          {assetStatusLabel[asset.status]}
                        </span>
                        <button type="button" disabled title="ویرایش جلسه هنوز در API این پنل پیاده‌سازی نشده است" className="cursor-not-allowed text-sm font-bold text-[#aaa6b8]">ویرایش</button>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="space-y-2 py-8 text-center">
                  <h3 className="font-extrabold text-[#1e1a33]">{query ? "محتوایی با این عنوان پیدا نشد" : "هنوز محتوایی برای این دوره ثبت نشده است"}</h3>
                  <p className="text-sm leading-7 text-[#7e7a94]">{query ? "عبارت جست‌وجو را تغییر دهید." : "ویدئوهای دوره پس از بارگذاری در این فهرست نمایش داده می‌شوند."}</p>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <h2 className="font-extrabold text-[#1e1a33]">دوره‌ای برای نمایش وجود ندارد</h2>
              <p className="mt-2 text-sm leading-7 text-[#7e7a94]">پس از ثبت یا دریافت درخواست نظارت دوره، محتوای آن از این بخش قابل مشاهده است.</p>
              <Link href="/institute/courses" className="mt-4 inline-flex rounded-lg bg-[#5b4ce2] px-4 py-2 text-sm font-bold text-white">رفتن به دوره‌ها</Link>
            </div>
          )}
        </section>

        <p role="note" className="rounded-lg border border-[#f0dfb3] bg-[#fff9eb] px-4 py-3 text-xs leading-6 text-[#7e6330]">
          فهرست با داده‌های واقعی ویدئو پر می‌شود. ساخت جلسه، ویرایش، اتصال آزمون و مرتب‌سازی دستی هنوز در مدل داده و API این پنل پشتیبانی نمی‌شود.
        </p>
      </div>
    </main>
  );
}
