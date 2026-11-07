import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const evaluationTopics = ["نگاه بنیادی‌شناسه", "ارتباط و هم‌افزایی", "رشد استعدادها"];

export default function EliteClubEvaluationIntroPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col gap-5">
        <header className="space-y-3 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink">ارزیابی باشگاه نخبگان</h2>
          <p className="text-sm leading-7 text-dena-muted">
            این ارزیابی بخشی از فرایند عضویت در باشگاه نخبگان است. به سوالات با دقت و تمرکز پاسخ دهید.
          </p>
        </header>

        <Card className="flex flex-col gap-6 rounded-2xl border border-dena-border p-5 sm:p-6">
          <ul className="flex flex-wrap gap-2" aria-label="موضوع‌های ارزیابی" dir="rtl">
            {evaluationTopics.map((topic) => (
              <li key={topic} className="rounded-full border border-dena-border bg-[#f7f6fb] px-4 py-2 text-sm text-dena-ink">
                {topic}
              </li>
            ))}
          </ul>

          <Link
            href="/student-demo/elite-club/register/evaluation/question"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-6 text-sm font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
          >
            شروع ارزیابی
          </Link>

          <p className="text-xs leading-6 text-dena-muted">
            این پیش‌نمایش برای نمایش مسیر ارزیابی است؛ پاسخ‌ها به پروندهٔ دانش‌آموز ارسال یا ذخیره نمی‌شوند.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
