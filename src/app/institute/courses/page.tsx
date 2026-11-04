import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { VerificationBadge } from "../../../components/ui/verification-badge";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteDashboardCourses } from "../../../server/institute/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دوره‌های مؤسسه | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار تصمیم مؤسسه",
  approved: "نظارت همین دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "ثبت نشده",
  pending: "در انتظار بازبینی مستقل",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;
const assessmentLabels = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;

export default async function InstituteCoursesPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string; query?: string; status?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const { cursor, query: rawQuery, status: rawStatus } = await searchParams;
  const query = rawQuery?.trim() ?? "";
  const status = ["published", "draft", "archived"].includes(rawStatus ?? "")
    ? rawStatus ?? ""
    : "";
  const result = await getInstituteDashboardCourses(instituteIds, cursor);
  if (result.invalidCursor) notFound();
  const courses = result.courses.filter((course) =>
    (!query || course.title.toLocaleLowerCase("fa-IR")
      .includes(query.toLocaleLowerCase("fa-IR"))) &&
    (!status || course.publicationStatus === status));

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <h1 className="text-xl font-extrabold text-[#1e1a33]">دوره‌ها</h1>
        <div className="flex items-center gap-3">
          <form action="/institute/courses" method="get" role="search" className="hidden w-[280px] items-center gap-2 rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 sm:flex">
            <span aria-hidden="true" className="text-[#7e7a94]">⌕</span>
            <input name="query" type="search" defaultValue={query} aria-label="جست‌وجو در دوره‌ها" placeholder="جستجو..." className="min-w-0 flex-1 bg-transparent text-right text-sm outline-none placeholder:text-[#7e7a94]" />
          </form>
          <Link href="/account" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">حساب من</Link>
        </div>
      </header>
      <div className="space-y-6 p-5 md:p-8">
        <section aria-labelledby="courses-heading" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="courses-heading" className="text-lg font-extrabold text-[#1e1a33]">مدیریت دوره‌ها</h2>
            <p className="mt-1 text-sm text-[#7e7a94]">دوره‌های مرتبط با عضویت فعال مؤسسه و وضعیت نظارت آن‌ها</p>
          </div>
          <Link href="/institute/courses/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#5b4ce2] px-4 py-2 text-sm font-bold text-white hover:bg-[#493bc7]">
            <span aria-hidden="true">＋</span>ایجاد دوره
          </Link>
        </section>
        <form action="/institute/courses" method="get" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e1ed] bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="course-status" className="text-sm font-bold text-[#1e1a33]">وضعیت انتشار</label>
            <select id="course-status" name="status" defaultValue={status} className="min-h-10 rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-sm text-[#1e1a33]">
              <option value="">همه وضعیت‌ها</option><option value="published">منتشرشده</option><option value="draft">پیش‌نویس</option><option value="archived">بایگانی‌شده</option>
            </select>
            {query && <input type="hidden" name="query" value={query} />}
            <button type="submit" className={buttonClassName("secondary")}>اعمال فیلتر</button>
          </div>
          <p className="text-xs text-[#7e7a94]">هر صفحه حداکثر ۲۰ دوره را نشان می‌دهد.</p>
        </form>
        <section aria-label="فهرست دوره‌ها" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
          {courses.length === 0 ? (
            <div className="space-y-3 p-6">
              <h3 className="font-extrabold text-[#1e1a33]">{query || status ? "دوره‌ای با این فیلترها پیدا نشد" : "دوره‌ای برای نمایش نیست"}</h3>
              <p className="text-sm leading-7 text-[#7e7a94]">{query || status ? "عبارت جست‌وجو یا وضعیت انتشار را تغییر دهید." : "دوره پس از ثبت درخواست نظارت یا انتقال مالکیت به مؤسسه در این فهرست ظاهر می‌شود."}</p>
              {!query && !status && <Link href="/institute/providers" className={buttonClassName()}>رفتن به صف نظارت</Link>}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] border-collapse text-right">
                  <thead className="bg-[#f8f7fc] text-[13px] text-[#7e7a94]"><tr>
                    <th className="px-5 py-4 font-bold">نام دوره</th><th className="px-5 py-4 font-bold">مدرس / ارائه‌دهنده</th><th className="px-5 py-4 font-bold">ویدئوهای آماده</th><th className="px-5 py-4 font-bold">ثبت‌نام فعال</th><th className="px-5 py-4 font-bold">وضعیت</th><th className="px-5 py-4 font-bold">درخواست نظارت</th><th className="px-5 py-4 font-bold">عملیات</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#e5e1ed] text-[13px] text-[#1e1a33]">
                    {courses.map((course) => <tr key={course.courseId} className="hover:bg-[#fbfaff]">
                      <td className="px-5 py-4 font-bold">{course.title}</td>
                      <td className="px-5 py-4">{course.independentEducatorName ?? course.providerName ?? "—"}</td>
                      <td className="px-5 py-4">{course.readyVideos.toLocaleString("fa-IR")}</td>
                      <td className="px-5 py-4">{course.activeEnrollmentCount.toLocaleString("fa-IR")}</td>
                      <td className="px-5 py-4"><span className={course.publicationStatus === "published" ? "rounded bg-[#e6f7f0] px-2 py-1 text-xs font-bold text-[#24845a]" : "rounded bg-[#fff3df] px-2 py-1 text-xs font-bold text-[#b7791f]"}>{publicationLabels[course.publicationStatus]}</span></td>
                      <td className="px-5 py-4">{supervisionLabels[course.supervisionStatus]}</td>
                      <td className="px-5 py-4"><Link href={`/institute/courses/${course.courseId}`} className="font-bold text-[#5b4ce2] hover:underline">جزئیات</Link></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 p-4 md:hidden">
                {courses.map((course) => <li key={course.courseId}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-3"><h3 className="font-extrabold leading-7 text-[#1e1a33]">{course.title}</h3><span className="rounded bg-[#f8f7fc] px-2 py-1 text-xs text-[#7e7a94]">{publicationLabels[course.publicationStatus]}</span></div>
                    <p className="text-sm text-[#7e7a94]">{course.independentEducatorName ?? course.providerName ?? "ارائه‌دهنده نامشخص"}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#7e7a94]"><span>{course.readyVideos.toLocaleString("fa-IR")} ویدئوی آماده</span><span>{course.activeEnrollmentCount.toLocaleString("fa-IR")} ثبت‌نام فعال</span></div>
                    <p className="text-xs leading-6 text-[#7e7a94]">{supervisionLabels[course.supervisionStatus]}</p>
                    <Link href={`/institute/courses/${course.courseId}`} className={buttonClassName()}>جزئیات دوره</Link>
                  </Card>
                </li>)}
              </ul>
            </>
          )}
        </section>
        <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی دوره‌ها">
          {cursor && <Link href="/institute/courses" className={buttonClassName("secondary")}>صفحهٔ نخست</Link>}
          {!query && !status && result.nextCursor && <Link href={`/institute/courses?cursor=${encodeURIComponent(result.nextCursor)}`} className={buttonClassName("secondary")}>دوره‌های بعدی</Link>}
        </nav>
        <p className="text-xs leading-6 text-[#7e7a94]">شمار ثبت‌نام‌ها تعداد عضویت‌های فعال است و الزاماً معادل تعداد دانش‌آموزان یکتا نیست.</p>
      </div>
    </main>
  );
}
