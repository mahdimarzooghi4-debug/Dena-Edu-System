import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoOpportunityIds = new Set(["sample-one"]);

export default async function BusinessSupportActivePreviewPage({
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

        <header className="space-y-2 text-right">
          <h2 className="text-2xl font-extrabold text-dena-ink">حمایت کسب‌وکار</h2>
          <p className="text-sm leading-7 text-dena-muted">فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.</p>
        </header>

        <Card className="flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border border-dena-border p-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-[#f7f6fb]">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="size-10 text-dena-brand" fill="none">
              <path d="M20 4 32 9v9c0 8-4.8 14-12 18C12.8 32 8 26 8 18V9l12-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="m14.5 19.5 3.7 3.7 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-dena-ink">این حمایت برای شما فعال است</h3>
            <p className="text-sm leading-6 text-dena-muted">جزئیات این حمایت از همین بخش قابل مشاهده است.</p>
          </div>
          <Link
            href={`/student-demo/elite-club/business-support/${opportunityId}`}
            className="inline-flex h-12 w-40 items-center justify-center rounded-xl bg-dena-brand px-6 text-[15px] font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
          >
            مشاهده جزئیات
          </Link>
          <p className="text-xs leading-6 text-dena-muted">این وضعیت نمونهٔ نمایشی است و فعال‌بودن حمایتی در پروندهٔ واقعی را نشان نمی‌دهد.</p>
        </Card>
      </div>
    </StudentShell>
  );
}
