import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InstituteQuestionForm } from "../../../../components/institute/question-form";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteQuestionBank } from "../../../../server/institute/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "افزودن سؤال | دنا", robots: { index: false, follow: false } };

export default async function NewInstituteQuestionPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "institute")) notFound();
  const result = await getInstituteQuestionBank(actor.userId);
  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f7f6fb]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <form action="/institute/question-bank" method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg border border-[#e5e1ed] px-3 py-2">
          <input name="search" type="search" placeholder="جستجو..."
            aria-label="جست‌وجو در بانک سؤال"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
          <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
        </form>
        <h1 className="text-xl font-bold text-[#1e1a33]">افزودن سؤال جدید</h1>
      </header>
      <div className="p-5 md:p-8">
        <InstituteQuestionForm courses={result.courses} />
      </div>
    </main>
  );
}
