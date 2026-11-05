import Link from "next/link";
import { BenefactorPageHeader } from "../../../components/benefactor/page-header";
import { Card } from "../../../components/ui/card";
import { buttonClassName } from "../../../components/ui/button";
import { requireBenefactorAccess } from "../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";

export default async function BenefactorReportsPage() {
  await requireBenefactorAccess();
  return <div>
    <BenefactorPageHeader title="گزارش‌های آموزشی" section="گزارش‌ها" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Card className="space-y-4">
        <h2 className="font-extrabold">گزارش‌های دانش‌آموزان تحت حمایت</h2>
        {[
          ["growth", "گزارش پیشرفت تجمیعی دانش‌آموزان", "روند رشد آموزشی در دوره‌های تحت حمایت"],
          ["course", "گزارش دوره‌ها و مباحث آموزشی", "خلاصهٔ پیشرفت و تکمیل دوره‌های آموزشی"],
          ["student", "گزارش عملکرد ناشناس", "نمای آموزشی با حفظ حریم خصوصی دریافت‌کنندگان حمایت"],
        ].map(([route, title, description]) => <div key={route} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dena-border p-4">
          <div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-6 text-dena-muted">{description}</p></div>
          <Link href={`/benefactor/reports/${route}`} className={buttonClassName()}>مشاهدهٔ گزارش</Link>
        </div>)}
      </Card>
    </main>
  </div>;
}
