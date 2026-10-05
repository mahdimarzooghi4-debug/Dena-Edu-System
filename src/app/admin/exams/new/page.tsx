import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../../components/admin/admin-shell";
import { ExamCreationForm } from "../../../../components/assessments/exam-creation-form";
import { getServerAccessContext } from "../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ساخت آزمون دنا | مدیریت", robots: { index: false, follow: false } };

export default async function NewDenaExamPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "admin")) notFound();
  return <AdminShell active="exams" canHandleSupport={actor.memberships.some((member) => member.role === "admin" && member.canHandleTechnicalSupport)}>
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
      <header><p className="text-sm font-bold text-dena-brand">آزمون هماهنگ دنا</p><h1 className="mt-1 text-2xl font-extrabold text-dena-deep">ساخت آزمون</h1></header>
      <ExamCreationForm kind="dena" />
    </main>
  </AdminShell>;
}
