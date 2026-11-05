import { z } from "zod";
import { getBenefactorLearning, getBenefactorAssessments, getBenefactorVideoActivity } from "../../../../server/benefactor/learning";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "../../../../components/ui/card";
import { BenefactorPageHeader } from "../../../../components/benefactor/page-header";
import { requireBenefactorAccess } from "../../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "گزارش آموزشی ناشناس | دنا", robots: { index: false, follow: false } };

const tabs = [
  { key: "overview", label: "نمای کلی" },
  { key: "courses", label: "دوره‌ها" },
  { key: "progress", label: "پیشرفت یادگیری" },
  { key: "assessments", label: "آزمون‌ها" },
  { key: "growth", label: "رشد" },
];

export default async function BenefactorLearningPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; recipient?: string }>;
}) {
  const { actor } = await requireBenefactorAccess();
  const { tab = "overview", recipient } = await searchParams;
  const current = tabs.find(({ key }) => key === tab);
  if (!current) notFound();
  if (!recipient || !z.uuid().safeParse(recipient).success) notFound();
  const courses = await getBenefactorLearning(actor.userId, recipient);
  if (!courses.length) notFound();
  const total = courses.reduce((sum, row) => sum + row.total_videos, 0);
  const completed = courses.reduce((sum, row) => sum + row.completed_videos, 0);
  const progress = total ? Math.round(completed / total * 100) : 0;
  const [assessments, activity] = await Promise.all([
    getBenefactorAssessments(actor.userId, recipient),
    getBenefactorVideoActivity(actor.userId, recipient),
  ]);
  const date = (value: string) => new Date(value).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });
  const events = [
    ...activity.map((row) => ({ at: row.completed_at, label: "تکمیل ویدئو در " + row.course_title })),
    ...assessments.map((row) => ({ at: row.submitted_at, label: "ثبت ارزیابی " + row.title + " · " + row.course_title })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 100);
  const points = [...assessments].reverse().map((row, index) => ({
    x: assessments.length === 1 ? 300 : 20 + index * 560 / (assessments.length - 1),
    y: 120 - (row.correct_count / Math.max(1, row.question_count)) * 100,
    row,
  }));

  return <div>
    <BenefactorPageHeader title={current.label + " · دانش‌آموز " + recipient.slice(0, 8)} section="دانش‌آموزان تحت حمایت" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Link href="/benefactor/students" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به دانش‌آموزان تحت حمایت</Link>
      <Card className="space-y-4">
        <h2 className="font-extrabold">گزارش آموزشی با حفظ حریم خصوصی</h2>
        <nav aria-label="بخش‌های گزارش آموزشی" className="flex flex-wrap gap-3 border-b border-dena-border">
          {tabs.map(({ key, label }) => <Link key={key} href={`/benefactor/students/learning?recipient=${recipient}&tab=${key}`}
            aria-current={key === tab ? "page" : undefined}
            className={`px-3 pb-3 text-sm ${key === tab ? "border-b-2 border-dena-brand font-bold text-dena-brand" : "text-dena-muted hover:text-dena-brand"}`}>{label}</Link>)}
        </nav>
      </Card>
      {tab === "overview" && <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card><h2 className="font-extrabold">خلاصهٔ پیشرفت ویدئوها</h2>
            <p className="my-3 text-sm">{completed.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} ویدئو تکمیل شده</p>
            {total > 0 && <progress aria-label="پیشرفت ویدئوهای دوره‌های تحت حمایت" className="h-2 w-full accent-dena-brand" value={progress} max={100} />}
          </Card>
          <Section title="دوره‌های تحت حمایت">{courses.map((row) => row.course_title).join("، ")}</Section>
        </div>
        <Card><h2 className="font-extrabold">آخرین فعالیت‌های یادگیری</h2>
          <ul className="mt-3 divide-y divide-dena-border">{events.slice(0, 5).map((event, index) =>
            <li key={index} className="py-3 text-sm"><p>{event.label}</p><time className="text-xs text-dena-muted">{date(event.at)}</time></li>)}</ul>
          {!events.length && <p className="mt-3 text-sm text-dena-muted">هنوز فعالیتی ثبت نشده است.</p>}
        </Card>
      </div>}
      {tab === "courses" && <div className="space-y-4">{courses.map((row, index) => <Card key={index}>
        <h2 className="font-extrabold">{row.course_title}</h2>
        <p className="my-3 text-sm text-dena-muted">{row.completed_videos.toLocaleString("fa-IR")} از {row.total_videos.toLocaleString("fa-IR")} ویدئوی تکمیل‌شده</p>
        {row.total_videos > 0 && <progress aria-label={row.course_title} className="h-2 w-full accent-dena-brand" value={row.completed_videos} max={row.total_videos} />}
      </Card>)}</div>}
      {tab === "progress" && <Card><h2 className="font-extrabold">رویدادنگاری یادگیری · حداکثر ۱۰۰ رویداد اخیر</h2>
        <ul className="mt-3 divide-y divide-dena-border">{events.map((event, index) =>
          <li key={index} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{event.label}</span><time className="text-dena-muted">{date(event.at)}</time></li>)}</ul>
        {!events.length && <p className="mt-3 text-sm text-dena-muted">هنوز فعالیتی ثبت نشده است.</p>}
      </Card>}
      {tab === "growth" && <Card>
        <h2 className="font-extrabold">روند درصد پاسخ صحیح در ارزیابی‌ها · حداکثر ۱۰۰ تلاش اخیر</h2>
        {points.length ? <div className="mt-5">
          <svg viewBox="0 0 600 140" role="img" aria-label="روند درصد پاسخ صحیح از صفر تا صد" className="h-48 w-full" direction="ltr">
            {[20, 70, 120].map((y) => <line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#e5e1ed" />)}
            <polyline points={points.map(({ x, y }) => x + "," + y).join(" ")} fill="none" stroke="#5b4ce2" strokeWidth="3" />
            {points.map(({ x, y, row }, index) => <circle key={index} cx={x} cy={y} r="4" fill="#5b4ce2">
              <title>{row.title} · {date(row.submitted_at)} · {Math.round(row.correct_count / Math.max(1, row.question_count) * 100).toLocaleString("fa-IR")}٪</title>
            </circle>)}
          </svg>
          <p className="text-sm text-dena-muted">روند از قدیمی‌ترین تلاش به تازه‌ترین تلاش نمایش داده می‌شود.</p>
        </div> : <p className="mt-4 text-sm text-dena-muted">برای نمایش روند، ارزیابی ثبت‌شده لازم است.</p>}
      </Card>}
      {tab === "assessments" && <Card className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-right text-sm">
          <caption className="sr-only">ارزیابی‌های آموزشی ناشناس</caption>
          <thead className="bg-dena-bg text-dena-muted"><tr>
            {["عنوان ارزیابی", "نوع ارزیابی", "تاریخ برگزاری", "نمرهٔ ارزیابی", "وضعیت"].map((label) =>
              <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-dena-border">
            {assessments.map((row, index) => <tr key={index}>
              <th scope="row" className="px-4 py-3">{row.title}<span className="block text-xs font-normal text-dena-muted">{row.course_title}</span></th>
              <td className="px-4 py-3">ارزیابی یادگیری</td>
              <td className="px-4 py-3">{date(row.submitted_at)}</td>
              <td className="px-4 py-3">{row.correct_count.toLocaleString("fa-IR")} از {row.question_count.toLocaleString("fa-IR")}</td>
              <td className="px-4 py-3">{row.outcome === "completed" ? "تکمیل‌شده" : "نیاز به مرور"}</td>
            </tr>)}
            {!assessments.length && <tr><td colSpan={5} className="px-4 py-6 text-dena-muted">هنوز ارزیابی تکمیل‌شده‌ای ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </Card>}
    </main>
  </div>;
}

function Section({ title, children }: { title: string; children: string }) {
  return <Card><h2 className="font-extrabold text-dena-deep">{title}</h2>
    <p className="mt-4 text-sm leading-7 text-dena-muted">{children}</p></Card>;
}
