import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteDashboardCourses, getInstituteStudents } from "../../../server/institute/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دانش‌آموزان | دنا",
  robots: { index: false, follow: false },
};

const fa = (value: number) => value.toLocaleString("fa-IR");

export default async function InstituteStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; status?: string; query?: string; page?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const selectedCourseId = params.courseId ?? "";
  const selectedStatus = ["active", "inactive"].includes(params.status ?? "")
    ? params.status ?? ""
    : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const [courseResult, allStudents] = await Promise.all([
    getInstituteDashboardCourses(instituteIds),
    getInstituteStudents(instituteIds),
  ]);
  const courses = courseResult.courses.filter((course) => course.supervisionStatus === "approved");
  if (selectedCourseId && !courses.some((course) => course.courseId === selectedCourseId)) {
    notFound();
  }

  const filteredStudents = allStudents.filter((student) => {
    const matchesCourse = !selectedCourseId || student.courseIds.includes(selectedCourseId);
    const matchesStatus = !selectedStatus || student.status === selectedStatus;
    const matchesQuery = !query ||
      student.name.toLocaleLowerCase("fa-IR").includes(query.toLocaleLowerCase("fa-IR"));
    return matchesCourse && matchesStatus && matchesQuery;
  });

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const students = filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  const pageHref = (nextPage: number) => {
    const values = new URLSearchParams();
    if (selectedCourseId) values.set("courseId", selectedCourseId);
    if (selectedStatus) values.set("status", selectedStatus);
    if (query) values.set("query", query);
    values.set("page", String(nextPage));
    return `/institute/students?${values.toString()}`;
  };

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <h1 className="text-xl font-extrabold text-[#1e1a33]">دانش‌آموزان</h1>
        <form action="/institute/students" method="get" role="search"
          className="flex w-full max-w-[360px] items-center gap-2 rounded-lg bg-[#f8f7fc] px-3 py-2">
          <span aria-hidden="true" className="text-[#7e7a94]">⌕</span>
          <input name="query" type="search" defaultValue={query} placeholder="جستجو..."
            aria-label="جست‌وجو نام دانش‌آموز"
            className="min-w-0 flex-1 bg-transparent text-right text-sm outline-none placeholder:text-[#7e7a94]" />
          {selectedCourseId && <input type="hidden" name="courseId" value={selectedCourseId} />}
          {selectedStatus && <input type="hidden" name="status" value={selectedStatus} />}
        </form>
      </header>

      <div className="space-y-5 p-5 md:p-8">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1e1a33]">دانش‌آموزان</h2>
            <p className="mt-1 text-sm text-[#7e7a94]">فهرست ثبت‌نام‌های دوره‌های تحت نظارت مؤسسه</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form action="/institute/students" method="get" className="flex flex-wrap items-center gap-2">
              {query && <input type="hidden" name="query" value={query} />}
              <label htmlFor="student-course" className="sr-only">همه دوره‌ها</label>
              <select id="student-course" name="courseId" defaultValue={selectedCourseId}
                className="min-h-10 rounded-lg border border-[#e5e1ed] bg-white px-3 text-sm text-[#1e1a33]">
                <option value="">همه دوره‌ها</option>
                {courses.map((course) => <option key={course.courseId} value={course.courseId}>{course.title}</option>)}
              </select>
              <label htmlFor="student-status" className="sr-only">فیلتر وضعیت</label>
              <select id="student-status" name="status" defaultValue={selectedStatus}
                className="min-h-10 rounded-lg border border-[#e5e1ed] bg-white px-3 text-sm text-[#1e1a33]">
                <option value="">فیلتر وضعیت</option>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
              <button type="submit" className="min-h-10 rounded-lg border border-[#e5e1ed] bg-white px-4 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">اعمال فیلتر</button>
            </form>
          </div>
        </section>

        <section aria-label="فهرست دانش‌آموزان" className="overflow-hidden rounded-xl border border-[#e8e6f0] bg-white">
          <div className="flex items-center justify-between border-b border-[#e8e6f0] px-5 py-4">
            <h3 className="font-extrabold text-[#1e1a33]">فهرست دانش‌آموزان</h3>
            <span className="text-xs text-[#767093]">{fa(filteredStudents.length)} دانش‌آموز</span>
          </div>

          {students.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-right">
                  <thead className="bg-[#f8f7fc] text-[13px] text-[#2a254b]">
                    <tr>
                      <th scope="col" className="w-[150px] px-4 py-4 text-center font-bold">عملیات</th>
                      <th scope="col" className="w-[120px] px-4 py-4 text-center font-bold">وضعیت</th>
                      <th scope="col" className="w-[190px] px-4 py-4 font-bold">آخرین فعالیت</th>
                      <th scope="col" className="px-4 py-4 font-bold">دوره‌های ثبت‌نام شده</th>
                      <th scope="col" className="w-[220px] px-4 py-4 font-bold">نام دانش‌آموز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.studentId} className="border-t border-[#e8e6f0] text-[13px] text-[#2a254b]">
                        <td className="px-4 py-4 text-center">
                          <Link href={`/institute/students/${student.studentId}`}
                            className="inline-flex rounded-md border border-[#5b4ce2] px-3 py-1.5 text-[11px] font-semibold text-[#5b4ce2] hover:bg-[#f4f1ff]">مشاهده پرونده</Link>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={student.status === "active"
                            ? "inline-flex rounded-md bg-[#e6fbf3] px-3 py-1.5 text-[11px] font-semibold text-[#10b981]"
                            : "inline-flex rounded-md bg-[#f2f0f7] px-3 py-1.5 text-[11px] font-semibold text-[#767093]"}>
                            {student.status === "active" ? "فعال" : "غیرفعال"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[#767093]" title="سامانه زمان آخرین فعالیت را نگهداری نمی‌کند">—</td>
                        <td className="px-4 py-4">{student.courseTitles.join("، ")}</td>
                        <th scope="row" className="px-4 py-4 font-semibold">{student.name}</th>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pageCount > 1 && (
                <nav aria-label="صفحه‌بندی فهرست دانش‌آموزان" className="flex items-center justify-between border-t border-[#e8e6f0] px-5 py-4 text-sm">
                  {page > 1
                    ? <Link href={pageHref(page - 1)} className="font-bold text-[#5b4ce2]">صفحهٔ قبل</Link>
                    : <span className="text-[#aaa6b8]">صفحهٔ قبل</span>}
                  <span className="text-[#767093]">صفحهٔ {fa(page)} از {fa(pageCount)}</span>
                  {page < pageCount
                    ? <Link href={pageHref(page + 1)} className="font-bold text-[#5b4ce2]">صفحهٔ بعد</Link>
                    : <span className="text-[#aaa6b8]">صفحهٔ بعد</span>}
                </nav>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <h3 className="font-extrabold text-[#1e1a33]">دانش‌آموزی برای نمایش پیدا نشد</h3>
              <p className="mt-2 text-sm leading-7 text-[#7e7a94]">
                {query || selectedCourseId || selectedStatus
                  ? "فیلترها را تغییر دهید یا پاک کنید."
                  : "ثبت‌نام دانش‌آموزان در دوره‌های تحت نظارت مؤسسه در این فهرست نمایش داده می‌شود."}
              </p>
              {(query || selectedCourseId || selectedStatus) && (
                <Link href="/institute/students" className="mt-4 inline-flex rounded-lg bg-[#5b4ce2] px-4 py-2 text-sm font-bold text-white">پاک‌کردن فیلترها</Link>
              )}
            </div>
          )}
        </section>

        {courseResult.hasMore && (
          <p role="note" className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-3 text-xs leading-6 text-[#7e7a94]">
            فهرست انتخاب دوره‌ها ۲۰ دورهٔ نخست را نشان می‌دهد؛ برای پوشش کامل دوره‌ها، صفحه‌بندی دوره‌ها در این فیلتر لازم است.
          </p>
        )}
        <p role="note" className="rounded-lg border border-[#f0dfb3] bg-[#fff9eb] px-4 py-3 text-xs leading-6 text-[#7e6330]">
          این فهرست فقط نام و دوره‌های ثبت‌نام‌شدهٔ دانش‌آموزان در دوره‌های تحت نظارت همین مؤسسه را نشان می‌دهد. زمان آخرین فعالیت در مدل فعلی ذخیره نمی‌شود.
        </p>
      </div>
    </main>
  );
}
