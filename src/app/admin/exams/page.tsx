import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { ExamStatusAction } from "../../../components/assessments/exam-status-action";
import { getServerAccessContext } from "../../../server/access/actor";
import { getDenaExams } from "../../../server/assessments/exam-management";
const reportHref = (id: string) => "/admin/exams/" + encodeURIComponent(id);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آزمون‌های هماهنگ دنا | مدیریت", robots: { index: false, follow: false } };

export default async function AdminExamsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "admin")) notFound();
  const state = await getDenaExams(actor.userId);
  if (!state) notFound();
  return <AdminShell active="exams" canHandleSupport={actor.memberships.some((member) => member.role === "admin" && member.canHandleTechnicalSupport)}>
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-bold text-dena-brand">ارزیابی سراسری</p><h1 className="mt-1 text-2xl font-extrabold text-dena-deep">آزمون‌های هماهنگ دنا</h1>
          <p className="mt-2 text-sm leading-7 text-dena-muted">آزمون‌های این بخش با بانک سؤال مستقل دنا ساخته می‌شوند.</p></div>
        <Link href="/admin/exams/new" className={buttonClassName("primary")}>ساخت آزمون هماهنگ</Link>
      </header>
      {state.exams.length === 0 ? <Card><p className="text-sm leading-7 text-dena-muted">هنوز آزمون هماهنگی ثبت نشده است.</p></Card> :
        <div className="overflow-x-auto rounded-xl border border-dena-border bg-white">
          <table className="w-full min-w-[700px] border-collapse text-right text-sm">
            <thead className="bg-dena-bg"><tr>{["عنوان", "سؤال", "مدت", "دفعات مجاز", "وضعیت", "شروع", "عملیات"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
            <tbody>{state.exams.map((exam) => <tr key={exam.id} className="border-t border-dena-border">
              <th scope="row" className="p-4 font-bold"><Link href={reportHref(exam.id)} className="text-dena-brand hover:underline">{exam.title}</Link></th><td className="p-4">{exam.questionCount.toLocaleString("fa-IR")}</td>
              <td className="p-4">{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</td><td className="p-4">{exam.attemptLimit.toLocaleString("fa-IR")}</td>
              <td className="p-4">{exam.status === "draft" ? "پیش‌نویس" : exam.status === "published" ? "منتشرشده" : "لغوشده"}</td>
              <td className="p-4">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(exam.startsAt)}</td>
              <td className="p-4"><ExamStatusAction id={exam.id} role="admin" status={exam.status} /></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </main>
  </AdminShell>;
}
