import { z } from "zod";
import { getBenefactorLearning } from "../../../../server/benefactor/learning";
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
  const unavailable = "گزارش آموزشی ناشناس هنوز برای این حساب در دسترس نیست.";

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
        <Section title="آخرین فعالیت‌های یادگیری">{unavailable}</Section>
      </div>}
      {tab === "courses" && <div className="space-y-4">{courses.map((row, index) => <Card key={index}>
        <h2 className="font-extrabold">{row.course_title}</h2>
        <p className="my-3 text-sm text-dena-muted">{row.completed_videos.toLocaleString("fa-IR")} از {row.total_videos.toLocaleString("fa-IR")} ویدئوی تکمیل‌شده</p>
        {row.total_videos > 0 && <progress aria-label={row.course_title} className="h-2 w-full accent-dena-brand" value={row.completed_videos} max={row.total_videos} />}
      </Card>)}</div>}
      {tab === "progress" && <Section title="رویدادنگاری و وضعیت فعلی دوره‌ها">{unavailable}</Section>}
      {tab === "growth" && <div className="space-y-5">
        <Section title="نمودار پایش مسیر یادگیری">{unavailable}</Section>
        <Section title="نقاط عطف و رویدادهای آموزشی">{unavailable}</Section>
      </div>}
      {tab === "assessments" && <Card className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-right text-sm">
          <caption className="sr-only">ارزیابی‌های آموزشی ناشناس</caption>
          <thead className="bg-dena-bg text-dena-muted"><tr>
            {["عنوان ارزیابی", "نوع ارزیابی", "تاریخ برگزاری", "نمرهٔ ارزیابی", "وضعیت"].map((label) =>
              <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody><tr><td colSpan={5} className="px-4 py-6 text-dena-muted">{unavailable}</td></tr></tbody>
        </table>
      </Card>}
    </main>
  </div>;
}

function Section({ title, children }: { title: string; children: string }) {
  return <Card><h2 className="font-extrabold text-dena-deep">{title}</h2>
    <p className="mt-4 text-sm leading-7 text-dena-muted">{children}</p></Card>;
}
