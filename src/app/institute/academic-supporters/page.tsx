import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteAcademicSupporters } from "../../../server/institute/academic-supporters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پشتیبانان تحصیلی | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

export default async function InstituteAcademicSupportersPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute"
      ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const supporters = await getInstituteAcademicSupporters(instituteIds);
  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-5 md:px-10">
        <span className="rounded-lg bg-[rgba(91,76,226,0.08)] px-3 py-1.5 text-xs font-bold text-[#5b4ce2]">پنل آموزشگاه</span>
        <h1 className="text-lg font-bold text-[#1e1a3c]">نمای کلی پشتیبانان تخصیص‌یافته به دوره‌های آموزشگاه</h1>
      </header>
      <div className="space-y-6 p-5 md:p-10">
        <section className="space-y-2 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
          <h2 className="font-bold text-[#1e1a3c]">دربارهٔ پشتیبانان تحصیلی</h2>
          <p className="text-sm leading-7 text-[#807b9a]">
            این صفحه پشتیبانانی را نشان می‌دهد که به دوره‌های آموزشگاه تخصیص داده شده‌اند. هر پشتیبان در چارچوب یک یا چند دوره با دانش‌آموزان مرتبط همراهی می‌کند.
          </p>
          <p className="text-xs leading-6 text-[#807b9a]">
            این فهرست از انتساب‌های دوره‌ای ساخته می‌شود؛ حوزهٔ تخصصی پشتیبان در داده‌های فعلی ثبت نشده است.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/institute/academic-supporters/opportunities"
            className="inline-flex min-h-10 items-center rounded-lg bg-[#5b4ce2] px-4 py-2 text-sm font-bold text-white hover:bg-[#4b3dc9]">
            مشاهده فرصت‌های حمایتی
          </Link>
          <h2 className="font-bold text-[#1e1a3c]">پشتیبانان تخصیص‌یافته به دوره‌های آموزشگاه</h2>
        </div>

        <section aria-label="پشتیبانان تحصیلی مؤسسه" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
          {supporters.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-right text-sm">
                  <thead className="bg-[#f7f6fb] text-[13px] font-bold text-[#807b9a]">
                    <tr>
                      <th scope="col" className="px-5 py-4">نام پشتیبان</th>
                      <th scope="col" className="px-5 py-4">دوره/دوره‌های مرتبط</th>
                      <th scope="col" className="px-5 py-4">حوزهٔ آموزشی</th>
                      <th scope="col" className="px-5 py-4">ثبت‌نام فعال در دوره‌ها</th>
                      <th scope="col" className="px-5 py-4">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e1ed] text-[#1e1a3c]">
                    {supporters.map((supporter) => {
                      const activeCourses = supporter.courses.filter((course) => course.status === "active");
                      const isActive = activeCourses.length > 0;
                      return (
                        <tr key={supporter.memberUserId}>
                          <th scope="row" className="px-5 py-4 font-semibold">{supporter.name}</th>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {supporter.courses.map((course) => (
                                <Link key={course.teamMemberId}
                                  href={`/institute/courses/${encodeURIComponent(course.courseId)}#institute-course-team`}
                                  className="text-[#5b4ce2] hover:underline">{course.title}</Link>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#807b9a]">در مخزن ثبت نشده</td>
                          <td className="px-5 py-4 text-[#807b9a]">{supporter.activeStudents.toLocaleString("fa-IR")}</td>
                          <td className="px-5 py-4">
                            <span className={isActive
                              ? "rounded-md bg-[rgba(16,185,129,0.08)] px-2.5 py-1 text-xs font-bold text-[#10b981]"
                              : "rounded-md bg-[#f1f0f5] px-2.5 py-1 text-xs font-bold text-[#807b9a]"}>
                              {isActive ? "فعال" : "غیرفعال"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-[#e5e1ed] md:hidden">
                {supporters.map((supporter) => {
                  const isActive = supporter.active;
                  return (
                    <li key={supporter.memberUserId} className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-[#1e1a3c]">{supporter.name}</h3>
                        <span className={isActive ? "rounded-md bg-[#e8fff3] px-2.5 py-1 text-xs font-bold text-[#10b981]" : "rounded-md bg-[#f1f0f5] px-2.5 py-1 text-xs font-bold text-[#807b9a]"}>
                          {isActive ? "فعال" : "غیرفعال"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        {supporter.courses.map((course) => <Link key={course.teamMemberId} className="text-[#5b4ce2]" href={`/institute/courses/${encodeURIComponent(course.courseId)}#institute-course-team`}>{course.title}</Link>)}
                      </div>
                      <p className="text-xs text-[#807b9a]">حوزهٔ تخصصی در مخزن ثبت نشده · {supporter.activeStudents.toLocaleString("fa-IR")} ثبت‌نام فعال در دوره‌های مرتبط</p>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="font-bold text-[#1e1a3c]">هنوز پشتیبانی به دوره‌های تحت نظارت مؤسسه تخصیص داده نشده است.</h3>
              <p className="mt-2 text-sm leading-7 text-[#807b9a]">پس از تأیید نظارت و تخصیص پشتیبان به تیم دوره، اطلاعات او در این فهرست نمایش داده می‌شود.</p>
              <Link href="/institute/courses" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#5b4ce2] px-4 text-sm font-semibold text-[#5b4ce2]">مشاهدهٔ دوره‌ها</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
