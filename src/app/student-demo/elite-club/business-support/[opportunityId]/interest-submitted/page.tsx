import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoOpportunityIds = new Set(["sample-one"]);

export default async function BusinessSupportInterestSubmittedPreviewPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (!demoOpportunityIds.has(opportunityId)) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="flex min-h-[65vh] flex-col gap-4">
        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/student-demo/elite-club" className="text-dena-brand hover:underline">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <Link href="/student-demo/elite-club/business-support" className="text-dena-muted hover:text-dena-brand">حمایت کسب‌وکار</Link>
        </nav>

        <Card className="flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border border-dena-border p-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-dena-surface-soft">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="size-10 text-dena-brand" fill="none">
              <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" />
              <path d="m13.5 20.5 4.2 4.2 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-dena-ink">علاقه‌مندی شما ثبت شد</h2>
            <p className="text-sm leading-6 text-dena-muted">در صورت وجود مراحل بعدی، از همین بخش قابل پیگیری خواهد بود.</p>
          </div>
          <p className="text-xs leading-6 text-dena-muted">این پیام فقط حالت نمایشی فیگما را نشان می‌دهد؛ چیزی در پروندهٔ واقعی ثبت نشده است.</p>
        </Card>

        <Link href="/student-demo/elite-club/business-support" className="self-start text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حمایت کسب‌وکار
        </Link>
      </div>
    </StudentShell>
  );
}
