import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoOpportunities = {
  "sample-one": {
    title: "فرصت کسب‌وکار نمونه",
    status: "فعال",
    statusClass: "bg-emerald-50 text-emerald-700",
  },
} as const;

export default async function StudentBusinessSupportDetailPreviewPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const opportunity = demoOpportunities[opportunityId as keyof typeof demoOpportunities];
  if (!opportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div className="space-y-4">
        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/student-demo/elite-club" className="text-dena-brand hover:underline">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <Link href="/student-demo/elite-club/business-support" className="text-dena-brand hover:underline">حمایت کسب‌وکار</Link>
          <span aria-hidden="true" className="text-dena-muted">←</span>
          <span className="text-dena-muted">جزئیات</span>
        </nav>

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">نمونه نمایشی</span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${opportunity.statusClass}`}>{opportunity.status}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-dena-ink md:text-[28px]">{opportunity.title}</h2>
        </header>

        <Card aria-label="خلاصهٔ فرصت کسب‌وکار نمونه" className="h-[96px] overflow-hidden rounded-[16px] border border-dena-border bg-white px-4 pt-6 shadow-none">
          <div aria-hidden="true" className="space-y-3">
            {[0, 1, 2, 3].map((line) => <div key={line} className="h-px w-full bg-[#f0eef8]" />)}
          </div>
        </Card>

        <div className="flex justify-center">
          <Link
            href={`/student-demo/elite-club/business-support/${opportunityId}/interest-submitted`}
            className="inline-flex h-12 w-40 items-center justify-center rounded-xl bg-dena-brand px-6 text-[15px] font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena-brand"
          >
            اعلام علاقه‌مندی
          </Link>
        </div>
      </div>
    </StudentShell>
  );
}
