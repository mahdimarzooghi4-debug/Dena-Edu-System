import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { requireOrganizationAccess } from "../../../server/organization/require-access";
import { getOrganizationPanelSnapshot } from "../../../server/organization/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "دامنهٔ دسترسی سازمان | دنا", robots: { index: false, follow: false } };

export default async function OrganizationAccessPage() {
  const { scopes } = await requireOrganizationAccess();
  const snapshot = await getOrganizationPanelSnapshot(scopes);
  const number = new Intl.NumberFormat("fa-IR");
  return <main id="main-content" className="space-y-5 p-5 md:p-8">
    <h1 className="text-2xl font-extrabold text-dena-deep">دامنهٔ دسترسی و حریم خصوصی سازمان</h1>
    <Card>
      <h2 className="font-extrabold">قوانین دسترسی به اطلاعات</h2>
      <p className="mt-3 text-sm leading-7 text-dena-muted">
        پرونده‌های ثبت‌شده و آمار تجمیعی در محدودهٔ عضویت‌های فعال این حساب نمایش داده می‌شوند.
        یادداشت‌های خصوصی و جزئیات نتایج آموزشی فردی در دسترس سازمان نیستند.
      </p>
    </Card>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="font-extrabold">سازمان‌های تحت پوشش این حساب</h2>
        <ul className="divide-y divide-dena-border text-sm">
          {snapshot.organizations.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-3 py-3">
            <Link href={`/organization/students?organizationId=${item.id}`} className="font-bold text-dena-brand hover:underline">{item.name}</Link>
            <span>{number.format(item.students)} پرونده</span>
          </li>)}
        </ul>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-extrabold">آمار کلی دسترسی</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt>پرونده‌های تحت پوشش</dt><dd>{number.format(snapshot.totals.students)}</dd></div>
          <div className="flex justify-between gap-3"><dt>عضویت‌های فعال سازمانی</dt><dd>{number.format(scopes.length)}</dd></div>
        </dl>
      </Card>
    </div>
  </main>;
}
