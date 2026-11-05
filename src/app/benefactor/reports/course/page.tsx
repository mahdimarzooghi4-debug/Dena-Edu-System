import { BenefactorReportState } from "../../../../components/benefactor/report-state";
import { requireBenefactorAccess } from "../../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  await requireBenefactorAccess();
  return <BenefactorReportState title="گزارش دورهٔ آموزشی" heading="گزارش نهایی دوره" columns={["شناسهٔ ناشناس", "میزان پیشرفت", "فعالیت‌های تکمیل‌شده", "وضعیت نهایی"]} message="گزارش آموزشی ناشناس هنوز برای این حساب در دسترس نیست." />;
}
