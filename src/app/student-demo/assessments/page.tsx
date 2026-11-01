import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

const activities = [
  { id: "math-7-practice", title: "تمرین تابع", course: "ریاضی دهم", status: "completed", label: "انجام‌شده", date: "دیروز" },
  { id: "physics-light", title: "تمرین فیزیک — نور", course: "فیزیک دهم", status: "pending", label: "در انتظار", date: "فردا" },
  { id: "chemistry-ch2", title: "آزمون فصل دوم شیمی", course: "شیمی دهم", status: "completed", label: "انجام‌شده", date: "۲ روز پیش" },
];

function rowClass(status: string) {
  return status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800";
}

export default async function StudentDemoAssessmentsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  const visible = filter === "all" ? activities : activities.filter(item => item.status === filter);
  return (
    <StudentShell active="assessments" title="تمرین‌ها و آزمون‌ها" demo>
      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        حالت نمایش اپ دانش‌آموز · داده‌ها نمونه‌اند و هیچ حساب یا پروندهٔ واقعی متصل نیست.
      </div>
      <div className="space-y-6" dir="rtl">
        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep">تمرین‌ها و آزمون‌ها</h2>
          <p className="text-sm leading-7 text-dena-muted">فعالیت‌های آموزشی دوره‌هایت را اینجا دنبال کن.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="rounded-xl border border-dena-border bg-white px-4 py-3 text-sm">همه دوره‌ها⌄</button>
          <nav aria-label="فیلتر فعالیت‌ها" className="flex flex-wrap gap-1 rounded-xl bg-dena-bg p-1">
            {[["completed","انجام‌شده"],["pending","در انتظار"],["ready","آماده انجام"],["all","همه"]].map(([key,label]) => (
              <Link key={key} href={key === "all" ? "/student-demo/assessments" : `/student-demo/assessments?filter=${key}`} aria-current={filter === key ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter === key ? "bg-white text-dena-brand shadow-sm" : "text-dena-muted"}`}>{label}</Link>
            ))}
          </nav>
        </div>
        {filter !== "completed" && filter !== "pending" && <Card className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-dena-lavender/40 p-6">
          <div className="text-right"><p className="text-xs text-dena-muted">زمان پیشنهادی · امروز &nbsp; | &nbsp; دوره · ریاضی دهم</p><span className="mt-2 inline-flex rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">آماده انجام</span><h3 className="mt-2 text-lg font-extrabold text-dena-deep">آزمون فصل سوم ریاضی</h3></div>
          <Link href="/student-demo/assessments/math-7-practice" className={buttonClassName()}>شروع آزمون</Link>
        </Card>}
        <div className="overflow-hidden rounded-[20px] border border-dena-border bg-white">
          {visible.map((item,index)=><div key={item.id} className={`flex flex-wrap items-center justify-between gap-4 p-5 ${index ? "border-t border-dena-border" : ""}`}>
            <div className="flex flex-wrap items-center gap-4"><span className={`rounded-full px-3 py-2 text-xs font-bold ${rowClass(item.status)}`}>{item.label}</span><span className="text-sm text-dena-muted">{item.course}</span><span className="font-bold text-dena-deep">{item.title}</span></div>
            {item.status === "pending" ? <span className="text-xs text-dena-muted">{item.date}</span> : <Link href={`/student-demo/assessments/${item.id}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-dena-brand hover:bg-dena-lavender">{item.status === "completed" ? "مشاهده نتیجه" : "شروع آزمون"}</Link>}
          </div>)}
          {visible.length===0&&<p className="p-8 text-center text-sm text-dena-muted">در این وضعیت فعالیتی برای نمایش نیست.</p>}
        </div>
        <p className="text-xs leading-6 text-dena-muted">فعالیت‌ها نمونه‌اند؛ پاسخ و نتیجه ذخیره نمی‌شوند و نمرهٔ رسمی نیستند.</p>
      </div>
    </StudentShell>
  );
}
