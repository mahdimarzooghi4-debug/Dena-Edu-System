import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

function DemoNotice() {
  return (
    <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      حالت نمایش اپ دانش‌آموز · داده‌ها نمونه‌اند و هیچ حساب یا پروندهٔ واقعی متصل نیست.
    </div>
  );
}

export default function StudentDemoAssessmentsPage() {
  return (
    <StudentShell active="assessments" title="تمرین‌ها و آزمون‌ها" demo>
      <DemoNotice />
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender p-6">
          <h2 className="text-2xl font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h2>
          <p className="mt-2 text-sm leading-7 text-dena-muted">نمونه‌ای از تمرین و بازخورد پاسخ در اپ دانش‌آموز.</p>
        </section>
        <div className="grid gap-4">
          <Card className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] p-5">
            <div>
              <p className="text-sm font-bold text-dena-brand">ریاضی پایه هفتم</p>
              <h3 className="mt-2 font-extrabold text-dena-deep">تمرین چهارگزینه‌ای نمونه</h3>
              <p className="mt-2 text-sm text-dena-muted">یک سؤال · بازخورد پس از ثبت پاسخ</p>
            </div>
            <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName()}>
              شروع تمرین نمونه
            </Link>
          </Card>
          <Card className="rounded-[22px] p-5">
            <h3 className="font-bold text-dena-deep">آزمون نمونهٔ علوم</h3>
            <p className="mt-2 text-sm text-dena-muted">این مورد فقط برای نمایش فهرست است.</p>
          </Card>
          <p className="text-xs leading-6 text-dena-muted">تمرین نمایشی است؛ پاسخ و نتیجه ذخیره نمی‌شوند و نمرهٔ رسمی نیستند.</p>
        </div>
      </div>
    </StudentShell>
  );
}
