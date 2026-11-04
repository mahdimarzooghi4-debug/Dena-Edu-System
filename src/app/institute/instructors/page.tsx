import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteInstructorDirectory } from "../../../server/institute/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مدرس‌ها | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

const roleLabel = { teacher: "مدرس" } as const;
const fa = (value: number) => value.toLocaleString("fa-IR");

export default async function InstituteInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const params = await searchParams;
  const query = (params.query ?? "").trim().slice(0, 100);
  const requestedStatus = params.status === "active" || params.status === "inactive"
    ? params.status : "all";
  const teachers = await getInstituteInstructorDirectory(instituteIds);
  const filtered = teachers.filter((teacher) =>
    (!query || teacher.name.toLocaleLowerCase("fa-IR").includes(query.toLocaleLowerCase("fa-IR")) ||
      teacher.courseTitle.toLocaleLowerCase("fa-IR").includes(query.toLocaleLowerCase("fa-IR"))) &&
    (requestedStatus === "all" || teacher.status === requestedStatus),
  );

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e8e6f0] bg-white px-5 py-4 md:px-8">
        <form action="/institute/instructors" method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg bg-[#f8f7fc] px-3 py-2">
          <span aria-hidden="true" className="text-[#767093]">⌕</span>
          <input name="query" type="search" defaultValue={query} placeholder="جستجو..."
            aria-label="جست‌وجوی مدرس یا دوره"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#767093]" />
          {requestedStatus !== "all" && <input type="hidden" name="status" value={requestedStatus} />}
        </form>
        <p className="text-sm font-bold text-[#5b4ce2]">مدرس‌ها</p>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/institute/courses"
            className="rounded-lg bg-[#5b4ce2] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#4b3dc9]">
            مشاهده دوره‌ها
          </Link>
          <h1 className="text-xl font-extrabold text-[#2a254b]">مدرس‌ها</h1>
        </div>

        <form action="/institute/instructors" method="get"
          className="flex flex-wrap items-center gap-3">
          {query && <input type="hidden" name="query" value={query} />}
          <label className="text-sm font-semibold text-[#767093]" htmlFor="instructor-status">وضعیت</label>
          <select id="instructor-status" name="status" defaultValue={requestedStatus}
            className="rounded-lg border border-[#e8e6f0] bg-white px-3 py-2 text-sm text-[#2a254b]">
            <option value="all">همه</option>
            <option value="active">فعال</option>
            <option value="inactive">پایان‌یافته</option>
          </select>
          <button className="rounded-lg border border-[#5b4ce2] px-3 py-2 text-sm font-semibold text-[#5b4ce2]">اعمال فیلتر</button>
        </form>

        <section id="directory" aria-label="فهرست مدرس‌های دوره‌های تحت نظارت"
          className="overflow-hidden rounded-xl border border-[#e8e6f0] bg-white">
          {filtered.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-right">
                  <thead className="bg-[#f0eeff] text-[13px] font-semibold text-[#2a254b]">
                    <tr>
                      <th scope="col" className="w-[160px] px-4 py-4 text-center">عملیات</th>
                      <th scope="col" className="w-[120px] px-4 py-4 text-center">وضعیت</th>
                      <th scope="col" className="w-[140px] px-4 py-4">تعداد جلسات</th>
                      <th scope="col" className="px-4 py-4">دوره‌های فعال</th>
                      <th scope="col" className="w-[220px] px-4 py-4">نام مدرس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e6f0] text-[13px] text-[#2a254b]">
                    {filtered.map((teacher) => (
                      <tr key={teacher.teamMemberId}>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/institute/courses/${teacher.courseId}#institute-course-team`}
                              className="rounded-md border border-[#5b4ce2] px-3 py-1.5 text-[11px] font-semibold text-[#5b4ce2] hover:bg-[#f0eeff]">ویرایش</Link>
                            <Link href={`/institute/courses/${teacher.courseId}`}
                              className="rounded-md bg-[#f8f7fc] px-3 py-1.5 text-[11px] font-semibold text-[#2a254b] hover:bg-[#eceaf5]">مشاهده</Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={teacher.status === "active"
                            ? "rounded-md bg-[#e6fbf3] px-3 py-1.5 text-[11px] font-semibold text-[#10b981]"
                            : "rounded-md bg-[#f8f7fc] px-3 py-1.5 text-[11px] font-semibold text-[#767093]"}>
                            {teacher.status === "active" ? "فعال" : "پایان‌یافته"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#767093]">در داده‌ها ثبت نمی‌شود</td>
                        <td className="px-4 py-3">{teacher.courseTitle}</td>
                        <td className="px-4 py-3 font-semibold">{teacher.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-[#e8e6f0] md:hidden">
                {filtered.map((teacher) => (
                  <li key={teacher.teamMemberId} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-bold text-[#2a254b]">{teacher.name}</h2>
                      <span className={teacher.status === "active"
                        ? "rounded-md bg-[#e6fbf3] px-3 py-1.5 text-xs font-semibold text-[#10b981]"
                        : "rounded-md bg-[#f8f7fc] px-3 py-1.5 text-xs font-semibold text-[#767093]"}>
                        {teacher.status === "active" ? "فعال" : "پایان‌یافته"}
                      </span>
                    </div>
                    <p className="text-sm text-[#767093]">{teacher.courseTitle}</p>
                    <p className="text-xs text-[#767093]">تعداد جلسات در داده‌های فعلی ثبت نمی‌شود.</p>
                    <Link href={`/institute/courses/${teacher.courseId}#institute-course-team`}
                      className="inline-flex min-h-10 items-center rounded-md border border-[#5b4ce2] px-3 text-xs font-semibold text-[#5b4ce2]">مشاهده تیم دوره</Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <h2 className="font-bold text-[#2a254b]">{teachers.length ? "مدرسی با این فیلتر پیدا نشد." : "هنوز مدرسی برای دوره‌های مورد تأیید ثبت نشده است."}</h2>
              <p className="mt-2 text-sm leading-7 text-[#767093]">
                این فهرست فقط مدرس‌های منصوب‌شده به دوره‌هایی را نشان می‌دهد که نظارت مؤسسه بر آن‌ها تأیید شده است.
              </p>
              {query || requestedStatus !== "all" ? <Link href="/institute/instructors" className="mt-4 inline-block text-sm font-bold text-[#5b4ce2]">پاک‌کردن فیلترها</Link> : null}
            </div>
          )}
        </section>
        <p role="note" className="text-xs leading-6 text-[#767093]">
          شمار جلسات مدرس در مدل فعلی مخزن ذخیره نمی‌شود؛ برای جلوگیری از نمایش عدد ساختگی، این مقدار از دادهٔ دوره قابل محاسبه نیست.
        </p>
        <p className="text-left text-xs text-[#767093]">نمایش {fa(filtered.length)} انتساب مدرس</p>
      </div>
    </main>
  );
}
