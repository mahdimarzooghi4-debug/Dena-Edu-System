import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { DenaQuestionBankWorkspace } from "../../../components/admin/dena-question-bank-workspace";
import { getServerAccessContext } from "../../../server/access/actor";
import { getDenaQuestionBank } from "../../../server/admin/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "بانک سؤال دنا | مدیریت", robots: { index: false, follow: false } };

export default async function AdminQuestionBankPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "admin")) notFound();
  const state = await getDenaQuestionBank(actor.userId);
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
        <DenaQuestionBankWorkspace questions={state.questions} />
      </main>
    </AdminShell>
  );
}
