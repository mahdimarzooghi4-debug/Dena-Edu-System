import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { BenefactorPageHeader } from "../../../components/benefactor/page-header";
import { requireBenefactorAccess } from "../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "رشد و پیشرفت | دنا", robots: { index: false, follow: false } };

export default async function BenefactorGrowthPage() {
  await requireBenefactorAccess();
  return <div>
    <BenefactorPageHeader title="رشد و پیشرفت دانش‌آموزان تحت حمایت" section="رشد و پیشرفت" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Card className="overflow-x-auto">
        <h2 className="mb-4 font-extrabold">نمای کلی پیشرفت آموزشی</h2>
        <table className="w-full min-w-[36rem] text-right text-sm">
          <thead className="bg-dena-bg text-dena-muted"><tr>
            {["شناسهٔ ناشناس", "دورهٔ تحصیلی", "شروع مسیر", "وضعیت فعلی", "آخرین تغییر"].map((label) =>
              <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody><tr><td colSpan={5} className="px-4 py-6 text-dena-muted">گزارش رشد آموزشی هنوز برای این حساب در دسترس نیست.</td></tr></tbody>
        </table>
      </Card>
      <Link href="/benefactor/reports/growth" className="inline-block text-sm font-bold text-dena-brand hover:underline">مشاهدهٔ گزارش تجمیعی رشد</Link>
    </main>
  </div>;
}
