import { BenefactorReportState } from "../../../../components/benefactor/report-state";
import { requireBenefactorAccess } from "../../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  await requireBenefactorAccess();
  return <BenefactorReportState title="روند رشد دانش‌آموزان تحت حمایت" heading="نمودار تجمیعی رشد و پیشرفت" message="گزارش آموزشی ناشناس هنوز برای این حساب در دسترس نیست." />;
}
