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
    <StudentShell active="elite" title="باشگاه نخبگان">
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
            <Link href="/student/elite-club" className="text-[#5b4ce2] hover:underline">باشگاه نخبگان</Link>
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
            <svg aria-hidden="true" viewBox="0 0 40 40" className="size-10 text-[#00bf83]" fill="none">
              <path d="M20 4 32 9v9c0 8-4.8 14-12 18C12.8 32 8 26 8 18V9l12-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="m14.5 19.5 3.7 3.7 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex w-full shrink-0 flex-col items-center gap-2">
            <h3 className="w-full text-base font-bold leading-[25px] text-[#111827]">
              پیش‌نمایش وضعیت فعال حمایت
            </h3>
            <p className="w-full text-[13px] leading-5 text-[#6b7280]">
              جزئیات این حمایت از همین بخش قابل مشاهده است.
            </p>
          </div>
          <Link
            href={`/student/elite-club/business-support/${opportunityId}`}
            className="inline-flex h-12 w-40 items-center justify-center rounded-xl bg-[#5b4ce2] px-6 text-[15px] font-medium text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4ce2]"
          >
            مشاهده جزئیات
          </Link>
        </Card>
      </div>
    </StudentShell>
  );
}
