import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteQuestionBank } from "../../../server/institute/question-bank";
import { getInstituteScopes } from "../../../server/institute/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "بانک سؤال مؤسسه | دنا",
  robots: { index: false, follow: false },
};

const fa = (value: number) => value.toLocaleString("fa-IR");
const dateLabel = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "short",
  timeZone: "Asia/Tehran",
}).format(value);

export default async function InstituteQuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; courseId?: string; lessonId?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "institute")) notFound();
  const scopes = await getInstituteScopes(actor.userId);
  if (!scopes.length) notFound();

  const params = await searchParams;
  const search = params.search?.trim().slice(0, 120) ?? "";
  const courseId = params.courseId ?? "";
  const lessonId = params.lessonId ?? "";
  const result = await getInstituteQuestionBank(actor.userId, search || undefined);
  const selectedCourse = result.courses.find((course) => course.id === courseId);
  const visibleQuestions = result.questions.filter((question) =>
    (!courseId || question.courseId === courseId) &&
    (!lessonId || question.lessonAssetId === lessonId),
  );

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f7f6fb]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <form action="/institute/question-bank" method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg border border-[#e5e1ed] px-3 py-2">
          <input name="search" type="search" defaultValue={search} placeholder="جستجو..."
            aria-label="جست‌وجو در بانک سؤال"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
          <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
          {courseId && <input type="hidden" name="courseId" value={courseId} />}
          {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}
        </form>
        <h1 className="text-xl font-bold text-[#1e1a33]">بانک سؤال</h1>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/institute/question-bank/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#5b4ce2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4b3dc9]">
            <span aria-hidden="true">＋</span>
            افزودن سؤال جدید
          </Link>

          <form action="/institute/question-bank" method="get"
            className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="question-course">همه دوره‌ها</label>
            <select id="question-course" name="courseId" defaultValue={courseId}
              className="min-h-10 rounded-lg border border-[#e5e1ed] bg-white px-3 text-[13px] text-[#1e1a33]">
              <option value="">همه دوره‌ها</option>
              {result.courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="question-lesson">جلسه مرتبط</label>
            <select id="question-lesson" name="lessonId" defaultValue={lessonId}
              disabled={!selectedCourse}
              className="min-h-10 max-w-[220px] rounded-lg border border-[#e5e1ed] bg-white px-3 text-[13px] text-[#1e1a33] disabled:text-[#8b86a3]">
              <option value="">جلسه مرتبط</option>
              {(selectedCourse?.lessons ?? []).map((lesson) => (
                <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="question-text-search">جست‌وجو در متن سؤال</label>
            <div className="flex min-h-10 w-full min-w-[190px] max-w-[260px] items-center gap-2 rounded-lg border border-[#e5e1ed] bg-white px-3">
              <input id="question-text-search" name="search" type="search" defaultValue={search}
                placeholder="جستجو در متن سؤال..."
                className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
              <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
            </div>
            <button type="submit"
              className="min-h-10 rounded-lg border border-[#e5e1ed] bg-white px-3 text-[13px] font-semibold text-[#5b4ce2] hover:bg-[#f9f8fd]">
              اعمال فیلتر
            </button>
          </form>
        </div>

        {visibleQuestions.length === 0 ? (
          <section className="rounded-xl border border-[#e5e1ed] bg-white px-5 py-12 text-center">
            <h2 className="font-bold text-[#1e1a33]">
              {result.questions.length
                ? "سؤالی با این فیلترها پیدا نشد."
                : "سؤالی در بانک این مؤسسه نیست."}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#8b86a3]">
              {result.questions.length
                ? "فیلتر دوره، جلسه یا عبارت جست‌وجو را تغییر دهید."
                : "برای دوره‌های تحت نظارت تأییدشده می‌توانید سؤال چهارگزینه‌ای اضافه کنید."}
            </p>
            {search || courseId || lessonId ? (
              <Link href="/institute/question-bank"
                className="mt-4 inline-flex font-semibold text-[#5b4ce2] hover:underline">پاک‌کردن فیلترها</Link>
            ) : null}
          </section>
        ) : (
          <section aria-label="فهرست بانک سؤال"
            className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
            <p className="sr-only">نمایش {fa(visibleQuestions.length)} سؤال</p>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] border-collapse text-right text-[13px]">
                <thead className="bg-[#f9fafb] font-bold text-[#1e1a33]">
                  <tr>
                    <th scope="col" className="w-[120px] px-4 py-4">تاریخ ایجاد</th>
                    <th scope="col" className="w-[150px] px-4 py-4">قالب سؤال</th>
                    <th scope="col" className="w-[130px] px-4 py-4">جلسه مرتبط</th>
                    <th scope="col" className="w-[170px] px-4 py-4">دوره آموزشی</th>
                    <th scope="col" className="px-4 py-4">متن سؤال</th>
                  </tr>
                </thead>
                <tbody className="text-[#1e1a33]">
                  {visibleQuestions.map((question) => (
                    <tr key={question.id} className="border-t border-[#e5e1ed]">
                      <td className="whitespace-nowrap px-4 py-4">{dateLabel(question.createdAt)}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-[#e8fff3] px-2.5 py-1 text-xs font-semibold text-[#10b981]">چهارگزینه‌ای</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#6366f1]">{question.lessonTitle}</span>
                      </td>
                      <td className="px-4 py-4">{question.courseTitle}</td>
                      <td className="max-w-[440px] px-4 py-4 font-medium text-[#5b4ce2]">
                        <Link href={`/institute/question-bank/${question.id}/edit`}
                          className="line-clamp-2 hover:underline">{question.prompt}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#e5e1ed] md:hidden">
              {visibleQuestions.map((question) => (
                <li key={question.id} className="space-y-3 p-4">
                  <Link href={`/institute/question-bank/${question.id}/edit`}
                    className="block font-medium leading-7 text-[#5b4ce2]">{question.prompt}</Link>
                  <p className="text-sm text-[#1e1a33]">{question.courseTitle}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-[#eef2ff] px-2.5 py-1 font-semibold text-[#6366f1]">{question.lessonTitle}</span>
                    <span className="rounded-md bg-[#e8fff3] px-2.5 py-1 font-semibold text-[#10b981]">چهارگزینه‌ای</span>
                    <time dateTime={question.createdAt.toISOString()} className="text-[#8b86a3]">{dateLabel(question.createdAt)}</time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
