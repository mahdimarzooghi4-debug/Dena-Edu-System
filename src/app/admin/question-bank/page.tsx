import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { DenaQuestionBankWorkspace } from "../../../components/admin/dena-question-bank-workspace";
import { getServerAccessContext } from "../../../server/access/actor";
import { getDenaQuestionBank } from "../../../server/admin/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "بانک سؤال دنا | مدیریت", robots: { index: false, follow: false } };

export default async function AdminQuestionBankPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "admin")) notFound();
  const params = await searchParams;
  const state = await getDenaQuestionBank(actor.userId, { query: params.q, page: Number(params.page ?? 1) });
  if (!state) notFound();
  return (
    <AdminShell active="question-bank" canHandleSupport={actor.memberships.some((member) =>
      member.role === "admin" && member.canHandleTechnicalSupport,
    )}>
      <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
        <header>
          <p className="text-sm font-bold text-dena-brand">مدیریت محتوای آزمون</p>
          <h1 className="mt-1 text-2xl font-extrabold text-dena-deep">بانک سؤال دنا</h1>
          <p className="mt-2 text-sm leading-7 text-dena-muted">
            این بانک مالکیت مستقل دنا دارد و با بانک سؤال مؤسسه‌ها مشترک نیست.
          </p>
        </header>
        <form action="/admin/question-bank" method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex-1 text-sm font-bold">جست‌وجو در متن سؤال
            <input type="search" name="q" maxLength={200} defaultValue={state.query} className="mt-2 min-h-11 w-full rounded-lg border border-dena-border bg-white px-3 font-normal" />
          </label>
          <button type="submit" className="min-h-11 rounded-lg bg-dena-brand px-4 text-sm font-bold text-white">جست‌وجو</button>
          {state.query && <Link href="/admin/question-bank" className="py-3 text-sm font-bold text-dena-brand">حذف جست‌وجو</Link>}
        </form>
        <p className="text-xs text-dena-muted">{state.total.toLocaleString("fa-IR")} سؤال · صفحهٔ {state.page.toLocaleString("fa-IR")} از {state.pageCount.toLocaleString("fa-IR")}</p>
        <DenaQuestionBankWorkspace key={`${state.query}:${state.page}`} questions={state.questions} filtered={Boolean(state.query)} />
        <nav aria-label="صفحه‌بندی بانک سؤال" className="flex justify-between gap-3 text-sm font-bold text-dena-brand">
          {state.page > 1 ? <Link href={`/admin/question-bank?q=${encodeURIComponent(state.query)}&page=${state.page - 1}`}>صفحهٔ قبل</Link> : <span />}
          {state.page < state.pageCount ? <Link href={`/admin/question-bank?q=${encodeURIComponent(state.query)}&page=${state.page + 1}`}>صفحهٔ بعد</Link> : <span />}
        </nav>
      </main>
    </AdminShell>
  );
}
