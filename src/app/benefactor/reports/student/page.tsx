import { BenefactorReportState } from "../../../../components/benefactor/report-state";
import { requireBenefactorAccess } from "../../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  await requireBenefactorAccess();
  return <BenefactorReportState title="گزارش عملکرد ناشناس دانش‌آموزان" heading="خلاصهٔ عملکرد آموزشی" columns={["شناسهٔ ناشناس", "دوره", "پیشرفت", "آخرین ارزیابی"]} message="گزارش آموزشی ناشناس هنوز برای این حساب در دسترس نیست." />;
}
