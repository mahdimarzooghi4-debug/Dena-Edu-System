import { Card } from "../../../components/ui/card";
import { BenefactorPageHeader } from "../../../components/benefactor/page-header";
import { requireBenefactorAccess } from "../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";

export default async function BenefactorAccessPage() {
  const { scopes } = await requireBenefactorAccess();
  return <div>
    <BenefactorPageHeader title="دامنهٔ دسترسی و حریم خصوصی" section="تنظیمات" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Card><h2 className="font-extrabold">قوانین دسترسی به اطلاعات آموزشی</h2>
        <p className="mt-3 text-sm leading-7 text-dena-muted">گزارش‌های حمایت با حفظ حریم خصوصی دریافت‌کنندگان ارائه می‌شوند. نام، اطلاعات تماس و یادداشت‌های خصوصی دانش‌آموزان در پنل خیر قابل مشاهده نیستند.</p></Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card><h2 className="mb-4 font-extrabold">هویت‌های حمایتی مجاز</h2><ul className="divide-y divide-dena-border">
          {scopes.map(({ id, name }) => <li key={id} className="py-3 text-sm font-bold">{name}</li>)}</ul></Card>
        <Card><h2 className="font-extrabold">آمار کلی دسترسی</h2>
          <p className="mt-4 text-sm">عضویت‌های فعال · {scopes.length.toLocaleString("fa-IR")}</p></Card>
      </div>
    </main>
  </div>;
}
