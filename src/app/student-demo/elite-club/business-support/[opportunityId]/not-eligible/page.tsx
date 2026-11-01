import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoOpportunityIds = new Set(["sample-one"]);

export default async function BusinessSupportNotEligiblePreviewPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (!demoOpportunityIds.has(opportunityId)) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div
        dir="rtl"
        className="-mt-5 flex min-h-[calc(100svh-198px)] flex-col gap-4 py-4 lg:-mx-10 lg:-mt-10 lg:min-h-[calc(100vh-174px)] lg:px-10 lg:py-4"
      >
        <div className="flex shrink-0 flex-col gap-3">
          <nav
            dir="ltr"
            aria-label="مسیر صفحه"
            className="flex h-[22px] items-center justify-end gap-2 whitespace-nowrap text-sm"
          >
            <span dir="rtl" className="text-[#6b7280]">حمایت کسب‌وکار</span>
            <span aria-hidden="true" className="text-[#9ca3af]">←</span>
            <Link href="/student-demo/elite-club" className="text-[#5b4ce2] hover:underline">باشگاه نخبگان</Link>
          </nav>
          <header className="flex h-[60px] shrink-0 flex-col gap-1.5 text-right">
            <h2 className="text-[22px] font-bold leading-[34px] text-[#111827]">حمایت کسب‌وکار</h2>
            <p className="text-[13px] leading-5 text-[#6b7280]">
              فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.
            </p>
          </header>
        </div>

        <Card className="flex min-h-[504px] flex-1 flex-col items-center justify-center gap-5 rounded-2xl border-[#e5e1ed] p-6 text-center shadow-[0px_4px_8px_rgba(0,0,0,0.03)]">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-[40px] bg-[#f7f6fb]">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="size-10 text-[#9ca3af]" fill="none">
              <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M16.2 15.5a4 4 0 1 1 6.8 2.9c-1.8 1.6-3 2.1-3 4.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="27.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="flex w-full shrink-0 flex-col items-center gap-2">
            <h3 className="w-full text-base font-bold leading-[25px] text-[#111827]">
              در حال حاضر قابل استفاده نیست
            </h3>
            <p className="w-full text-[13px] leading-5 text-[#6b7280]">
              در حال حاضر شرایط استفاده از این حمایت برای شما فراهم نیست.
            </p>
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}
