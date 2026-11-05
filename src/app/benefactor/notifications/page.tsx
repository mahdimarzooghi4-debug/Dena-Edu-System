import { BenefactorPageHeader } from "../../../components/benefactor/page-header";
import { SupportNotifications } from "../../../components/support/support-notifications";
import { requireBenefactorAccess } from "../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "اعلان‌های خیر | دنا", robots: { index: false, follow: false } };

export default async function BenefactorNotificationsPage() {
  await requireBenefactorAccess();
  return <div>
    <BenefactorPageHeader title="اعلان‌ها و پیگیری‌ها" section="سامانه" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <h2 className="font-extrabold">پیگیری درخواست‌های پشتیبانی</h2>
      <SupportNotifications detailBase="/benefactor/support" />
    </main>
  </div>;
}
