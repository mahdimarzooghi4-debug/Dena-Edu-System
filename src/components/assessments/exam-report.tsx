import Link from "next/link";
import type { getExamReport } from "../../server/assessments/exam-management";
import { Card } from "../ui/card";
import { ExamStatusAction } from "./exam-status-action";

type Report = NonNullable<Awaited<ReturnType<typeof getExamReport>>>;
type ExamView = "overview" | "questions" | "results";
const date = (value: Date | null) => value
  ? new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
  }).format(value)
  : "—";

export function ExamReport({ report, backHref, activeView = "overview" }: {
  report: Report; backHref: string; activeView?: ExamView;
}) {
  const { exam, summary, attempts, questions, filters, nextCursor } = report;
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
  const tabHref = (view: ExamView) => baseHref + "?view=" + view;
  const isFinished = exam.status === "published" && exam.endsAt.getTime() < Date.now();
  const canEdit = summary.totalAttempts === 0 && exam.status !== "cancelled" &&
    (exam.status === "draft" || (exam.status === "published" && exam.startsAt.getTime() > Date.now()));
  const statusLabel = exam.status === "draft" ? "پیش‌نویس"
    : exam.status === "cancelled" ? "لغوشده" : isFinished ? "پایان‌یافته" : "فعال";
  const statusColor = exam.status === "draft" ? "bg-[#fff9e6] text-[#f59e0b]"
    : exam.status === "cancelled" ? "bg-[#fee2e2] text-[#ef4444]"
      : isFinished ? "bg-[#f3f4f6] text-[#6e6a8a]" : "bg-[#e8fff3] text-[#10b981]";

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f7f6fb]">
      <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <form action={backHref} method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg border border-[#e5e1ed] px-3 py-2">
          <input name="search" type="search" placeholder="جستجو..."
            aria-label="جست‌وجو در آزمون‌ها"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#8b86a3]" />
          <span aria-hidden="true" className="text-[#8b86a3]">⌕</span>
        </form>
        <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-xs">
          <Link href={backHref} className="text-[#8b86a3] hover:text-[#5b4ce2]">آزمون‌های یادگیری</Link>
          <span aria-hidden="true" className="text-[#8b86a3]">‹</span>
          <span className="font-medium text-[#5b4ce2]">{exam.title}</span>
        </nav>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold leading-8 text-[#1e1a33]">{exam.title}</h1>
              <span className={"rounded-md px-2.5 py-1 text-xs font-semibold " + statusColor}>{statusLabel}</span>
            </div>
            <p className="text-sm leading-7 text-[#6e6a8a]">
              پرسش‌های این آزمون از بانک سؤال آموزشگاه انتخاب شده‌اند.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canEdit && (
              <Link href={baseHref + "/edit"}
                className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#5b4ce2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4b3dc9]">
                ویرایش آزمون
              </Link>
            )}
            <Link href={tabHref("results")}
              className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[#5b4ce2] px-5 py-2.5 text-sm font-semibold text-[#5b4ce2] hover:bg-[#f7f6fb]">
              مشاهده نتایج
            </Link>
            <ExamStatusAction id={exam.id}
              role={backHref.startsWith("/admin") ? "admin" : "institute"}
              status={exam.status} />
          </div>
        </section>

        <section className="space-y-4">
          <nav aria-label="بخش‌های آزمون" className="flex gap-1 overflow-x-auto border-b border-[#e5e1ed]">
            {([
              ["overview", "نمای کلی"],
              ["questions", "سؤالات"],
              ["results", "نتایج ارزیابی"],
            ] as const).map(([view, label]) => (
              <Link key={view} href={tabHref(view)} aria-current={activeView === view ? "page" : undefined}
                className={"shrink-0 border-b-2 px-4 py-2 text-[15px] " +
                  (activeView === view
                    ? "border-[#5b4ce2] font-bold text-[#5b4ce2]"
                    : "border-transparent text-[#8b86a3] hover:text-[#5b4ce2]")}>
                {label}
              </Link>
            ))}
          </nav>

          {activeView === "overview" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="space-y-4 rounded-xl border-[#e5e1ed] p-5">
                <h2 className="text-base font-bold text-[#1e1a33]">اطلاعات کلی آزمون</h2>
                <dl className="divide-y divide-[#e5e1ed]">
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">دوره آموزشی</dt>
                    <dd className="font-medium text-[#1e1a33]">{exam.courseTitle ?? "آزمون هماهنگ دنا"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">تعداد کل سؤالات</dt>
                    <dd className="font-medium text-[#1e1a33]">{exam.questionCount.toLocaleString("fa-IR")} سؤال</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">مدت زمان آزمون</dt>
                    <dd className="font-medium text-[#1e1a33]">{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">دبیر طراح آزمون</dt>
                    <dd className="font-medium text-[#1e1a33]">{exam.createdByName}</dd>
                  </div>
                </dl>
              </Card>
              <Card className="space-y-4 rounded-xl border-[#e5e1ed] p-5">
                <h2 className="text-base font-bold text-[#1e1a33]">آمار مشارکت و ارزیابی</h2>
                <dl className="divide-y divide-[#e5e1ed]">
                  <div className="flex items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">تعداد کل شرکت‌کنندگان</dt>
                    <dd className="font-medium text-[#1e1a33]">{summary.participants.toLocaleString("fa-IR")} دانش‌آموز</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">میانگین نمره آزمون</dt>
                    <dd className="font-medium text-[#1e1a33]">
                      {summary.averageEarnedScore.toLocaleString("fa-IR")} از {summary.maxTotalPoints.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-3 text-sm">
                    <dt className="text-[#6e6a8a]">بیشترین نمره کسب شده</dt>
                    <dd className="font-medium text-[#1e1a33]">
                      {summary.maxEarnedScore.toLocaleString("fa-IR")} از {summary.maxTotalPoints.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                </dl>
                {summary.participants === 0 && (
                  <p className="rounded-lg bg-[#f7f6fb] p-3 text-xs leading-6 text-[#6e6a8a]">
                    پس از ثبت اولین پاسخ، آمار ارزیابی در این بخش نمایش داده می‌شود.
                  </p>
                )}
              </Card>
            </div>
          )}

          {activeView === "questions" && (
            <section aria-label="سؤالات آزمون" className="space-y-3">
              {questions.length === 0 ? (
                <Card><p className="text-sm text-[#6e6a8a]">سؤالی برای این آزمون ثبت نشده است.</p></Card>
              ) : questions.map((question, index) => (
                <Card key={question.id} className="space-y-3 rounded-xl border-[#e5e1ed] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold leading-7 text-[#1e1a33]">
                      سؤال { (index + 1).toLocaleString("fa-IR") } · {question.prompt}
                    </h2>
                    <span className="text-xs text-[#6e6a8a]">{question.points.toLocaleString("fa-IR")} امتیاز</span>
                  </div>
                  <ol className="grid gap-2 sm:grid-cols-2">
                    {[question.option0, question.option1, question.option2, question.option3].map((option, optionIndex) => (
                      <li key={optionIndex}
                        className={"rounded-lg border px-3 py-2 text-sm leading-6 " +
                          (question.correctOption === optionIndex
                            ? "border-[#a7f3d0] bg-[#e8fff3] text-[#047857]"
                            : "border-[#e5e1ed] text-[#1e1a33]")}>
                        <span className="font-semibold">{(optionIndex + 1).toLocaleString("fa-IR")}.</span> {option}
                        {question.correctOption === optionIndex && <span className="mr-2 text-xs font-semibold">پاسخ صحیح</span>}
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </section>
          )}

          {activeView === "results" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="خلاصهٔ عملکرد آزمون">
                {[
                  ["شرکت‌کنندگان", summary.participants],
                  ["کل تلاش‌ها", summary.totalAttempts],
                  ["ثبت‌شده", summary.submitted],
                  ["در حال انجام", summary.inProgress],
                  ["اتمام زمان", summary.expired],
                  ["میانگین درصد نمره", summary.averageScorePercent.toLocaleString("fa-IR") + "٪"],
                ].map(([label, value]) => (
                  <Card key={label} className="space-y-2 rounded-xl border-[#e5e1ed] p-4">
                    <p className="text-sm text-[#6e6a8a]">{label}</p>
                    <p className="text-xl font-bold text-[#1e1a33]">{value.toLocaleString("fa-IR")}</p>
                  </Card>
                ))}
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-[#1e1a33]">تلاش‌های دانش‌آموزان</h2>
                <p className="text-xs text-[#6e6a8a]">
                  آمار بالا برای همهٔ تلاش‌هاست؛ این جدول بر اساس فیلترها نمایش داده می‌شود.
                </p>
              </div>
              <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e5e1ed] bg-white p-4">
                <input type="hidden" name="view" value="results" />
                <label className="grid gap-1 text-sm font-semibold text-[#1e1a33]">
                  نام دانش‌آموز
                  <input name="search" defaultValue={filters.search} maxLength={80}
                    className="min-h-11 rounded-lg border border-[#e5e1ed] px-3" />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[#1e1a33]">
                  وضعیت تلاش
                  <select name="status" defaultValue={filters.status}
                    className="min-h-11 rounded-lg border border-[#e5e1ed] bg-white px-3">
                    <option value="">همهٔ وضعیت‌ها</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="submitted">ثبت‌شده</option>
                    <option value="expired">اتمام زمان</option>
                  </select>
                </label>
                <button className="min-h-11 rounded-lg bg-[#5b4ce2] px-4 font-bold text-white">اعمال فیلتر</button>
                <a href={exportHref}
                  className="min-h-11 rounded-lg border border-[#5b4ce2] px-4 py-2.5 text-sm font-bold text-[#5b4ce2]">
                  دریافت CSV نتایج فیلترشده
                </a>
              </form>
              {attempts.length === 0 ? (
                <Card><p className="text-sm text-[#6e6a8a]">هنوز دانش‌آموزی در این آزمون شرکت نکرده است.</p></Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e5e1ed] bg-white">
                  <table className="w-full min-w-[760px] border-collapse text-right text-sm">
                    <thead className="bg-[#f9fafb]"><tr>
                      {["دانش‌آموز", "تلاش", "وضعیت", "شروع", "ثبت پاسخ", "پاسخ درست", "امتیاز", "درصد"].map((heading) =>
                        <th key={heading} scope="col" className="p-4">{heading}</th>)}
                    </tr></thead>
                    <tbody>{attempts.map((attempt) => <tr key={attempt.id} className="border-t border-[#e5e1ed]">
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
                </div>
              )}
              {attempts.length > 0 && <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6e6a8a]">{attempts.length.toLocaleString("fa-IR")} تلاش در این صفحه</span>
                {nextCursor && <Link href={baseHref + "?view=results" + queryString(true)}
                  className="rounded-lg border border-[#5b4ce2] px-4 py-2 font-bold text-[#5b4ce2]">صفحهٔ بعد</Link>}
              </div>}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
