import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteExams } from "../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "آزمون‌های یادگیری | دنا",
  robots: { index: false, follow: false },
};
type ExamStatusFilter = "all" | "published" | "draft" | "completed" | "cancelled";
const formatDate = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "short",
  timeZone: "Asia/Tehran",
}).format(value);

export default async function InstituteExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();

  const params = await searchParams;
  const search = params.search?.trim().slice(0, 80) ?? "";
  const validStatuses: ExamStatusFilter[] = ["all", "published", "draft", "completed", "cancelled"];
  const status = validStatuses.includes(params.status as ExamStatusFilter)
    ? params.status as ExamStatusFilter
    : "all";
  const result = await getInstituteExams(actor.userId);
  const now = Date.now();
  const filtered = result.exams.filter((exam) => {
    const matchesSearch = !search || exam.title.toLocaleLowerCase("fa-IR")
      .includes(search.toLocaleLowerCase("fa-IR"));
    const currentStatus: ExamStatusFilter = exam.status === "cancelled"
      ? "cancelled"
      : exam.status === "draft"
        ? "draft"
        : exam.endsAt.getTime() < now ? "completed" : "published";
    return matchesSearch && (status === "all" || status === currentStatus);
  });

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f7f6fb]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <form action="/institute/exams" method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg border border-[#e5e1ed] px-3 py-2">
          <input name="search" type="search" defaultValue={search} placeholder="جستجو..."
            aria-label="جست‌وجو در آزمون‌ها"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
          <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
        </form>
        <h1 className="text-xl font-bold text-[#1e1a33]">آزمون‌های یادگیری</h1>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form action="/institute/exams" method="get" className="flex flex-wrap items-center gap-3">
            <label htmlFor="exam-status" className="sr-only">وضعیت آزمون</label>
            <select id="exam-status" name="status" defaultValue={status}
              className="min-h-9 rounded-lg border border-[#e5e1ed] bg-white px-3 text-[13px] text-[#1e1a33]">
              <option value="all">وضعیت آزمون</option>
              <option value="published">فعال</option>
              <option value="draft">پیش‌نویس</option>
              <option value="completed">پایان‌یافته</option>
              <option value="cancelled">لغوشده</option>
            </select>
            <label htmlFor="exam-search" className="sr-only">جست‌وجو بر اساس نام</label>
            <div className="flex min-h-9 w-full min-w-[164px] max-w-[220px] items-center gap-2 rounded-lg border border-[#e5e1ed] bg-white px-3">
              <input id="exam-search" name="search" type="search" defaultValue={search}
                placeholder="جستجو بر اساس نام..."
                className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
              <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
            </div>
            <button type="submit"
              className="min-h-9 rounded-lg border border-[#e5e1ed] bg-white px-3 text-[13px] font-semibold text-[#5b4ce2] hover:bg-[#f9f8fd]">
              اعمال
            </button>
          </form>
          <Link href="/institute/exams/new"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#5b4ce2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4b3dc9]">
            <span aria-hidden="true">＋</span>
            ایجاد آزمون جدید
          </Link>
        </div>

        {result.denaExams.length > 0 && (
          <section aria-label="آزمون‌های هماهنگ دنا" className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1e1a33]">آزمون‌های سراسری هماهنگ دنا</h2>
                <p className="mt-1 text-sm text-[#8b86a3]">اطلاعات این آزمون‌ها فقط برای مشاهده در دسترس مؤسسه است.</p>
              </div>
              <span className="rounded-md bg-[#f0eefd] px-3 py-1.5 text-xs font-semibold text-[#5b4ce2]">فقط مشاهده</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {result.denaExams.map((exam) => (
                <Link key={exam.id} href={`/institute/exams/national/${encodeURIComponent(exam.id)}`}
                  className="flex min-h-[116px] flex-col justify-between gap-3 rounded-xl border border-[#e5e1ed] bg-white p-4 transition hover:border-[#b6aff3] hover:bg-[#fcfbff]">
                  <span className="font-bold leading-7 text-[#1e1a33]">{exam.title}</span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6e6a8a]">
                    <span>{exam.questionCount.toLocaleString("fa-IR")} سؤال</span>
                    <span>{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</span>
                    <time dateTime={exam.startsAt.toISOString()}>{formatDate(exam.startsAt)}</time>
                    <span className="font-semibold text-[#5b4ce2]">نمایش جزئیات ←</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 ? (
          <section className="rounded-xl border border-[#e5e1ed] bg-white px-5 py-12 text-center">
            <h2 className="font-bold text-[#1e1a33]">
              {result.exams.length ? "آزمونی با این فیلترها پیدا نشد." : "هنوز آزمونی ساخته نشده است."}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#8b86a3]">
              {result.exams.length
                ? "عبارت جست‌وجو یا وضعیت آزمون را تغییر دهید."
                : "برای ساخت آزمون، سؤال‌های موردنیاز را ابتدا در بانک سؤال مؤسسه ثبت کنید."}
            </p>
            {search || status !== "all" ? (
              <Link href="/institute/exams" className="mt-4 inline-flex font-semibold text-[#5b4ce2] hover:underline">
                پاک‌کردن فیلترها
              </Link>
            ) : (
              <Link href="/institute/exams/new"
                className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#5b4ce2] px-4 text-sm font-semibold text-white">
                ایجاد آزمون جدید
              </Link>
            )}
          </section>
        ) : (
          <section aria-label="فهرست آزمون‌های یادگیری" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] border-collapse text-right text-[13px]">
                <thead className="bg-[#f9fafb] font-bold text-[#1e1a33]">
                  <tr>
                    <th scope="col" className="px-4 py-4">نام آزمون</th>
                    <th scope="col" className="w-[180px] px-4 py-4">دوره آموزشی</th>
                    <th scope="col" className="w-[100px] px-4 py-4">تعداد سؤالات</th>
                    <th scope="col" className="w-[100px] px-4 py-4">مدت زمان</th>
                    <th scope="col" className="w-[120px] px-4 py-4">وضعیت</th>
                    <th scope="col" className="w-[120px] px-4 py-4">تاریخ برگزاری</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#1e1a33]">
                  {filtered.map((exam) => {
                    const completed = exam.status === "published" && exam.endsAt.getTime() < now;
                    const label = exam.status === "draft" ? "پیش‌نویس"
                      : exam.status === "cancelled" ? "لغوشده"
                        : completed ? "پایان‌یافته" : "فعال";
                    const badge = exam.status === "draft"
                      ? "bg-[#fff9e6] text-[#f59e0b]"
                      : exam.status === "cancelled"
                        ? "bg-[#fee2e2] text-[#ef4444]"
                        : completed ? "bg-[#f3f4f6] text-[#6e6a8a]"
                          : "bg-[#e8fff3] text-[#10b981]";
                    return (
                      <tr key={exam.id} className="border-t border-[#e5e1ed]">
                        <th scope="row" className="px-4 py-4 text-right font-semibold text-[#5b4ce2]">
                          <Link href={`/institute/exams/${encodeURIComponent(exam.id)}`} className="hover:underline">
                            {exam.title}
                          </Link>
                        </th>
                        <td className="px-4 py-4">{exam.courseTitle}</td>
                        <td className="whitespace-nowrap px-4 py-4">{exam.questionCount.toLocaleString("fa-IR")} سؤال</td>
                        <td className="whitespace-nowrap px-4 py-4">{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${badge}`}>{label}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">{formatDate(exam.startsAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#e5e1ed] md:hidden">
              {filtered.map((exam) => {
                const completed = exam.status === "published" && exam.endsAt.getTime() < now;
                const label = exam.status === "draft" ? "پیش‌نویس"
                  : exam.status === "cancelled" ? "لغوشده"
                    : completed ? "پایان‌یافته" : "فعال";
                const badge = exam.status === "draft"
                  ? "bg-[#fff9e6] text-[#f59e0b]"
                  : exam.status === "cancelled" ? "bg-[#fee2e2] text-[#ef4444]"
                    : completed ? "bg-[#f3f4f6] text-[#6e6a8a]" : "bg-[#e8fff3] text-[#10b981]";
                return (
                  <li key={exam.id} className="space-y-3 p-4">
                    <Link href={`/institute/exams/${encodeURIComponent(exam.id)}`}
                      className="block font-semibold leading-7 text-[#5b4ce2]">{exam.title}</Link>
                    <p className="text-sm text-[#1e1a33]">{exam.courseTitle}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6e6a8a]">
                      <span>{exam.questionCount.toLocaleString("fa-IR")} سؤال</span>
                      <span>·</span>
                      <span>{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</span>
                      <span className={`rounded-md px-2.5 py-1 font-semibold ${badge}`}>{label}</span>
                      <time dateTime={exam.startsAt.toISOString()}>{formatDate(exam.startsAt)}</time>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
