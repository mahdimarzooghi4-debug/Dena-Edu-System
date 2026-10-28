import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";
import { buttonClassName } from "@/components/ui/button";
import { DemoPracticeCard } from "@/components/student-demo/practice-card";

function DemoNotice() {
  return (
    <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      حالت نمایش اپ دانش‌آموز · داده‌ها نمونه‌اند و هیچ حساب یا پروندهٔ واقعی متصل نیست.
    </div>
  );
}

export default function StudentDemoPracticePage() {
  return (
    <StudentShell active="assessments" title="تمرین نمونهٔ ریاضی" demo>
      <DemoNotice />
      <div className="space-y-5">
        <Link href="/student-demo/assessments" className={buttonClassName("outline")}>
          بازگشت به تمرین‌ها و آزمون‌ها
        </Link>
        <DemoPracticeCard />
      </div>
    </StudentShell>
  );
}
