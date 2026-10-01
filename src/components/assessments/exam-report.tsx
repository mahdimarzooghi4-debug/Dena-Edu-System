import Link from "next/link";
import type { getExamReport } from "../../server/assessments/exam-management";
import { Card } from "../ui/card";

type Report = NonNullable<Awaited<ReturnType<typeof getExamReport>>>;
const date = (value: Date | null) => value
  ? new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
  }).format(value)
  : "—";

export function ExamReport({ report, backHref }: {
  report: Report; backHref: string;
}) {
  const { exam, summary, attempts, filters, nextCursor } = report;
  const queryString = (includeCursor = false) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (includeCursor && nextCursor) params.set("cursor", nextCursor);
    const value = params.toString();
    return value ? "?" + value : "";
  };
  const baseHref = backHref + "/" + encodeURIComponent(exam.id);
  const exportHref = (backHref.startsWith("/admin") ? "/api/admin" : "/api/institute") +
    "/exams/" + encodeURIComponent(exam.id) + "/report.csv" + queryString();
  const metrics = [
    ["شرکت‌کننده", summary.participants],
    ["کل تلاش‌ها", summary.totalAttempts],
    ["ثبت‌شده", summary.submitted],
    ["در حال انجام", summary.inProgress],
    ["پایان‌یافته با اتمام زمان", summary.expired],
    ["میانگین درصد امتیاز", summary.averageScorePercent.toLocaleString("fa-IR") + "٪"],
  ] as const;
  return <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
    <header className="space-y-3">
      <Link href={backHref} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به فهرست آزمون‌ها</Link>
      <p className="pt-2 text-sm font-bold text-dena-brand">
        {exam.examType === "dena_coordinated" ? "آزمون هماهنگ دنا" : "آزمون برنامه‌ریزی‌شدهٔ مؤسسه"}
        {exam.courseTitle ? " · " + exam.courseTitle : ""}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-extrabold text-dena-deep">{exam.title}</h1>
          <p className="mt-2 text-sm text-dena-muted">
            {date(exam.startsAt)} · {exam.durationMinutes.toLocaleString("fa-IR")} دقیقه ·
            {" "}{exam.questionCount.toLocaleString("fa-IR")} سؤال
          </p></div>
        <span className="rounded-full bg-dena-lavender px-3 py-2 text-sm font-bold text-dena-brand">
          {exam.status === "draft" ? "پیش‌نویس" : exam.status === "published" ? "منتشرشده" : "لغوشده"}
        </span>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="خلاصهٔ عملکرد آزمون">
      {metrics.map(([label, value]) => <Card key={label} className="space-y-2">
        <p className="text-sm text-dena-muted">{label}</p>
        <p className="text-2xl font-extrabold text-dena-deep">
          {typeof value === "number" ? value.toLocaleString("fa-IR") : value}
        </p>
      </Card>)}
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-dena-deep">تلاش‌های دانش‌آموزان</h2>
        <p className="text-xs text-dena-muted">
          آمار بالا برای همهٔ تلاش‌هاست؛ این جدول بر اساس فیلترها نمایش داده می‌شود.
        </p>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-dena-border bg-white p-4">
        <label className="grid gap-1 text-sm font-semibold text-dena-deep">
          نام دانش‌آموز
          <input name="search" defaultValue={filters.search} maxLength={80} className="min-h-11 rounded-lg border border-dena-border px-3" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-dena-deep">
          وضعیت تلاش
          <select name="status" defaultValue={filters.status} className="min-h-11 rounded-lg border border-dena-border bg-white px-3">
            <option value="">همهٔ وضعیت‌ها</option>
            <option value="in_progress">در حال انجام</option>
            <option value="submitted">ثبت‌شده</option>
            <option value="expired">اتمام زمان</option>
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-dena-brand px-4 font-bold text-white">اعمال فیلتر</button>
        <a href={exportHref} className="min-h-11 rounded-lg border border-dena-brand px-4 py-2.5 text-sm font-bold text-dena-brand">دریافت CSV نتایج فیلترشده</a>
      </form>
      {attempts.length === 0 ? <Card><p className="text-sm text-dena-muted">هنوز دانش‌آموزی در این آزمون شرکت نکرده است.</p></Card> :
        <div className="overflow-x-auto rounded-xl border border-dena-border bg-white">
          <table className="w-full min-w-[760px] border-collapse text-right text-sm">
            <thead className="bg-dena-bg"><tr>
              {["دانش‌آموز", "تلاش", "وضعیت", "شروع", "ثبت پاسخ", "پاسخ درست", "امتیاز", "درصد"].map((heading) =>
                <th key={heading} scope="col" className="p-4">{heading}</th>)}
            </tr></thead>
            <tbody>{attempts.map((attempt) => <tr key={attempt.id} className="border-t border-dena-border">
              <th scope="row" className="p-4 font-semibold">{attempt.studentName}</th>
              <td className="p-4">{attempt.attemptNumber.toLocaleString("fa-IR")}</td>
              <td className="p-4">{attempt.status === "in_progress" ? "در حال انجام" :
                attempt.status === "submitted" ? "ثبت‌شده" : "اتمام زمان"}</td>
              <td className="p-4">{date(attempt.startedAt)}</td>
              <td className="p-4">{date(attempt.submittedAt)}</td>
              <td className="p-4">{attempt.correctCount === null ? "—" : attempt.correctCount.toLocaleString("fa-IR")}</td>
              <td className="p-4">{attempt.earnedPoints === null ? "—" :
                attempt.earnedPoints.toLocaleString("fa-IR") + " از " + (attempt.totalPoints ?? 0).toLocaleString("fa-IR")}</td>
              <td className="p-4">{attempt.scorePercent === null ? "—" : attempt.scorePercent.toLocaleString("fa-IR") + "٪"}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      {attempts.length > 0 && <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-dena-muted">{attempts.length.toLocaleString("fa-IR")} تلاش در این صفحه</span>
        {nextCursor && <Link href={baseHref + queryString(true)} className="rounded-lg border border-dena-brand px-4 py-2 font-bold text-dena-brand">صفحهٔ بعد</Link>}
      </div>}
    </section>
  </main>;
}
