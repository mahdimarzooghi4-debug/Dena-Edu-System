import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getInstituteExams } from "../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "آزمون سراسری | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

const fa = (value: number) => value.toLocaleString("fa-IR");
const date = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "long",
  timeZone: "Asia/Tehran",
}).format(value);

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-[#1e1a3c]">{value}</span>
      <span className="text-[#807b9a]">{label}</span>
    </div>
  );
}

export default async function InstituteNationalAssessmentPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) =>
    membership.role === "institute")) notFound();

  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  const { denaExams, asOf } = await getInstituteExams(actor.userId);
  const exam = denaExams.find((item) => item.id === examId);
  if (!exam) notFound();

  const status = exam.status === "cancelled" ? "لغوشده"
    : exam.status === "draft" ? "پیش‌نویس"
      : exam.endsAt.getTime() < asOf.getTime() ? "پایان‌یافته" : "فعال";

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <Link href="/institute/exams"
            className="rounded-lg border border-[#e5e1ed] px-3 py-2 text-sm font-semibold text-[#5b4ce2] hover:bg-[#f8f7fc]">
            بازگشت به آزمون‌ها
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-[rgba(91,76,226,0.08)] px-3 py-1.5 text-xs font-bold text-[#5b4ce2]">پنل آموزشگاه</span>
          <h1 className="text-lg font-bold text-[#1e1a3c]">آزمون سراسری — نمای مشاهده</h1>
        </div>
      </header>

      <div className="space-y-6 p-5 md:p-10">
        <section role="note" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[rgba(91,76,226,0.19)] bg-[rgba(91,76,226,0.06)] p-5">
          <div>
            <h2 className="font-bold leading-7 text-[#1e1a3c]">
              این بخش فقط اطلاعات آزمون‌های هماهنگ دنا را برای مؤسسه نمایش می‌دهد.
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#807b9a]">
              آزمون هماهنگ از پنل مؤسسه قابل ایجاد یا ویرایش نیست؛ دسترسی نمرات فردی نیز در این بخش ارائه نمی‌شود.
            </p>
          </div>
          <span className="rounded-md bg-[#5b4ce2] px-3 py-1.5 text-xs font-bold text-white">فقط مشاهده</span>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-5 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <h2 className="text-base font-bold text-[#1e1a3c]">مشخصات آزمون</h2>
            <div className="h-px bg-[#e5e1ed]" />
            <Fact label="نام ارزیابی" value={exam.title} />
            <Fact label="مرجع" value="آزمون هماهنگ دنا" />
            <Fact label="تاریخ شروع" value={date(exam.startsAt)} />
            <Fact label="تاریخ پایان" value={date(exam.endsAt)} />
            <Fact label="مدت پاسخ‌گویی" value={`${fa(exam.durationMinutes)} دقیقه`} />
            <Fact label="تعداد سؤال" value={`${fa(exam.questionCount)} سؤال`} />
            <Fact label="وضعیت" value={status} />
            <Fact label="شناسهٔ مرجع" value={exam.id} />
          </section>

          <section className="space-y-5 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <h2 className="text-base font-bold text-[#1e1a3c]">سرفصل‌ها و جزئیات نتایج</h2>
            <div className="h-px bg-[#e5e1ed]" />
            <div className="rounded-lg bg-[#f8f7fc] p-4">
              <p className="font-semibold text-[#1e1a3c]">اطلاعات تفکیکی ثبت نشده است</p>
              <p className="mt-2 text-sm leading-7 text-[#807b9a]">
                ساختار فعلی داده‌ها فقط عنوان، زمان‌بندی، مدت و تعداد سؤال را نگه می‌دارد. توزیع سؤال بر اساس سرفصل و جزئیات نتایج دانش‌آموزان در دسترس این پنل نیست.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
