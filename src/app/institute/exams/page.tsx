import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { ExamStatusAction } from "../../../components/assessments/exam-status-action";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteExams } from "../../../server/assessments/exam-management";
const reportHref = (id: string) => "/institute/exams/" + encodeURIComponent(id);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آزمون‌ها | پنل مؤسسه", robots: { index: false, follow: false } };
const date = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);

export default async function InstituteExamsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();
  const result = await getInstituteExams(actor.userId);
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-7 px-5 py-8 md:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-bold text-dena-brand">مدیریت ارزیابی</p>
          <h1 className="mt-1 text-2xl font-extrabold text-dena-deep">آزمون‌های مؤسسه</h1>
          <p className="mt-2 text-sm leading-7 text-dena-muted">برای آزمون‌های برنامه‌ریزی‌شده از بانک سؤال همین مؤسسه استفاده می‌شود.</p></div>
        <Link href="/institute/exams/new" className={buttonClassName("primary")}>ساخت آزمون</Link>
      </header>
      <section className="space-y-4" aria-labelledby="institute-exams-heading">
        <h2 id="institute-exams-heading" className="text-lg font-extrabold text-dena-deep">آزمون‌های برنامه‌ریزی‌شده</h2>
        {result.exams.length === 0 ? <Card><p className="text-sm leading-7 text-dena-muted">هنوز آزمونی ساخته نشده است. تعداد آزمون‌های برنامه‌ریزی‌شده محدودیتی ندارد.</p></Card> :
          <div className="overflow-x-auto rounded-xl border border-dena-border bg-white">
            <table className="w-full min-w-[760px] border-collapse text-right text-sm">
              <thead className="bg-dena-bg"><tr>{["نام آزمون", "دوره", "سؤال", "مدت", "وضعیت", "زمان شروع", "عملیات"].map((label) => <th className="p-4" key={label}>{label}</th>)}</tr></thead>
              <tbody>{result.exams.map((exam) => <tr key={exam.id} className="border-t border-dena-border">
                <th scope="row" className="p-4 font-bold"><Link href={reportHref(exam.id)} className="text-dena-brand hover:underline">{exam.title}</Link></th><td className="p-4">{exam.courseTitle}</td>
                <td className="p-4">{exam.questionCount.toLocaleString("fa-IR")}</td><td className="p-4">{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</td>
                <td className="p-4">{exam.status === "draft" ? "پیش‌نویس" : exam.status === "published" ? "منتشرشده" : "لغوشده"}</td><td className="p-4">{date(exam.startsAt)}</td>
                <td className="p-4"><ExamStatusAction id={exam.id} role="institute" status={exam.status} /></td>
              </tr>)}</tbody>
            </table>
          </div>}
      </section>
      <section className="space-y-4" aria-labelledby="dena-exams-heading">
        <div><h2 id="dena-exams-heading" className="text-lg font-extrabold text-dena-deep">آزمون‌های هماهنگ دنا</h2>
          <p className="mt-1 text-sm text-dena-muted">این آزمون‌ها را دنا مدیریت می‌کند؛ مؤسسه امکان ساخت یا ویرایش آن‌ها را ندارد.</p></div>
        {result.denaExams.length === 0 ? <Card><p className="text-sm text-dena-muted">آزمون هماهنگ منتشرشده‌ای در دسترس نیست.</p></Card> :
          <ul className="grid gap-3 md:grid-cols-2">{result.denaExams.map((exam) => <li key={exam.id}><Card className="space-y-2">
            <h3 className="font-bold text-dena-deep">{exam.title}</h3><p className="text-sm text-dena-muted">{date(exam.startsAt)} · {exam.durationMinutes} دقیقه · {exam.questionCount} سؤال</p>
            <p className="text-xs text-dena-muted">نمایش فقط؛ مدیریت آزمون بر عهدهٔ دناست.</p>
          </Card></li>)}</ul>}
      </section>
    </main>
  );
}
