import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { buttonClassName } from "../../../components/ui/button";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteQuestionBank } from "../../../server/institute/question-bank";
import { getInstituteScopes } from "../../../server/institute/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "بانک سؤال مؤسسه | دنا", robots: { index: false, follow: false } };

export default async function InstituteQuestionBankPage({
  searchParams,
}: { searchParams: Promise<{ search?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "institute")) notFound();
  const scopes = await getInstituteScopes(actor.userId);
  if (!scopes.length) notFound();
  const { search } = await searchParams;
  const result = await getInstituteQuestionBank(actor.userId, search);

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-dena-brand">محتوای آموزشی مؤسسه</p>
          <h1 className="mt-1 text-2xl font-extrabold text-dena-deep">بانک سؤال</h1>
          <p className="mt-2 text-sm leading-7 text-dena-muted">
            سؤال‌های این فهرست فقط در بانک همین مؤسسه نگهداری می‌شوند.
          </p>
        </div>
        <Link href="/institute/question-bank/new" className={buttonClassName("primary")}>
          افزودن سؤال جدید
        </Link>
      </header>

      <form action="/institute/question-bank" className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="question-search">جستجو در متن سؤال</label>
        <input id="question-search" name="search" defaultValue={search ?? ""}
          placeholder="جستجو در متن سؤال..."
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-dena-border bg-white px-3 text-sm" />
        <button type="submit" className={buttonClassName("secondary")}>جستجو</button>
      </form>

      {result.questions.length === 0 ? (
        <Card>
          <h2 className="font-bold text-dena-deep">سؤالی در بانک این مؤسسه نیست.</h2>
          <p className="mt-2 text-sm leading-7 text-dena-muted">
            پس از آماده‌شدن جلسه‌های دورهٔ تحت نظارت، سؤال چهارگزینه‌ای اضافه کن.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-dena-muted">
            نمایش {result.questions.length.toLocaleString("fa-IR")} سؤال اخیر
          </p>
          <div className="hidden overflow-x-auto rounded-xl border border-dena-border bg-white md:block">
            <table className="w-full min-w-[800px] border-collapse text-right text-sm">
              <thead className="bg-dena-bg text-dena-deep">
                <tr>
                  <th scope="col" className="p-4">متن سؤال</th>
                  <th scope="col" className="p-4">دورهٔ آموزشی</th>
                  <th scope="col" className="p-4">جلسهٔ مرتبط</th>
                  <th scope="col" className="p-4">قالب سؤال</th>
                  <th scope="col" className="p-4">تاریخ ایجاد</th>
                  <th scope="col" className="p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map((question) => (
                  <tr key={question.id} className="border-t border-dena-border align-top">
                    <td className="max-w-[360px] p-4 font-medium text-dena-brand">{question.prompt}</td>
                    <td className="p-4">{question.courseTitle}</td>
                    <td className="p-4">{question.lessonTitle}</td>
                    <td className="p-4">چهارگزینه‌ای</td>
                    <td className="whitespace-nowrap p-4">
                      {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(question.createdAt)}
                    </td>
                    <td className="p-4">
                      <Link href={`/institute/question-bank/${question.id}/edit`} className="font-bold text-dena-brand hover:underline">
                        ویرایش
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {result.questions.map((question) => (
              <li key={question.id}>
                <Card className="space-y-2">
                  <h2 className="font-bold leading-7 text-dena-brand">{question.prompt}</h2>
                  <p className="text-sm text-dena-muted">{question.courseTitle} · {question.lessonTitle}</p>
                  <p className="text-xs text-dena-muted">
                    {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(question.createdAt)} · چهارگزینه‌ای
                  </p>
                  <Link href={`/institute/question-bank/${question.id}/edit`} className="inline-flex pt-2 text-sm font-bold text-dena-brand hover:underline">
                    ویرایش سؤال
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
