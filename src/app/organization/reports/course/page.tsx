import Link from "next/link";
import { Card } from "../../../../components/ui/card";
import { requireOrganizationAccess } from "../../../../server/organization/require-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "گزارش دوره | دنا", robots: { index: false, follow: false } };

export default async function OrganizationCourseReport() {
  await requireOrganizationAccess();
  return <main id="main-content" className="space-y-5 p-5 md:p-8">
    <Link href="/organization/reports" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به گزارش‌ها</Link>
    <h1 className="text-2xl font-extrabold text-dena-deep">گزارش نهایی دورهٔ آموزشی</h1>
    <Card>
      <h2 className="font-extrabold">اطلاعات دوره</h2>
      <p className="mt-3 text-sm leading-7 text-dena-muted">اطلاعات دوره در دسترس این سازمان نیست.</p>
    </Card>
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-right text-sm">
        <caption className="sr-only">پیشرفت دانش‌آموزان در دوره</caption>
        <thead className="bg-dena-bg text-dena-muted"><tr>
          {["نام دانش‌آموز", "میزان پیشرفت مباحث", "آخرین نرخ تکمیل فعالیت‌ها", "تعداد تکالیف تکمیل‌شده", "وضعیت نهایی"].map((label) =>
            <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
        </tr></thead>
        <tbody><tr><td colSpan={5} className="px-4 py-5 text-dena-muted">
          جزئیات پیشرفت و تکالیف فردی در دسترس این سازمان نیست.
        </td></tr></tbody>
      </table>
    </Card>
  </main>;
}
