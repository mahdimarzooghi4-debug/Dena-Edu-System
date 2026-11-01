import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const opportunities = {
  "sample-one": {
    title: "فرصت کسب‌وکار نمونه",
    status: "فعال",
  },
} as const;

function StatusBadges({ status }: { status: string }) {
  return (
    <div dir="ltr" className="flex shrink-0 items-center gap-1.5 lg:gap-2">
      <span className="inline-flex h-[25px] items-center rounded-full bg-[#ededf2] px-2.5 text-[11px] font-semibold leading-[17px] text-[#737380] lg:h-8 lg:px-4 lg:text-[13px] lg:leading-5">
        نمونه نمایشی
      </span>
      <span className="inline-flex h-[25px] items-center rounded-full bg-[#e8f8f0] px-2.5 text-[11px] font-semibold leading-[17px] text-[#10b981] lg:h-8 lg:px-4 lg:text-[13px] lg:leading-5">
        {status}
      </span>
    </div>
  );
}

function InfoLines() {
  return (
    <Card
      aria-label="اطلاعات فرصت کسب‌وکار"
      className="flex h-[68px] shrink-0 flex-col justify-between rounded-[20px] border-[#e5e1ed] px-4 py-4 shadow-[0px_4px_8px_rgba(0,0,0,0.03)] lg:h-24 lg:px-6 lg:py-6"
    >
      {[1, 2, 3, 4].map((line) => (
        <div key={line} aria-hidden="true" className="h-px w-full shrink-0 bg-[#e5e1ed]" />
      ))}
    </Card>
  );
}

export default async function BusinessSupportDetailPage({
  params,
}: {
  params: Promise<{ supportId: string }>;
}) {
  const { supportId } = await params;
  const opportunity = opportunities[supportId as keyof typeof opportunities];
  if (!opportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div
        dir="rtl"
        className="-mt-1 flex flex-col gap-[14px] lg:-mt-10 lg:gap-4 lg:pt-4"
      >
        <nav
          dir="rtl"
          aria-label="مسیر صفحه"
          className="flex h-5 shrink-0 items-center justify-start gap-1.5 whitespace-nowrap text-[12px] text-[#5b4ce2] lg:hidden"
        >
          <Link href="/student-demo/elite-club" className="hover:underline">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club/business-support" className="hover:underline">حمایت کسب‌وکار</Link>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <span className="text-[#6b7280]">جزئیات</span>
        </nav>

        <nav
          dir="ltr"
          aria-label="مسیر صفحه"
          className="hidden h-[22px] shrink-0 items-center justify-start gap-2 whitespace-nowrap text-sm lg:flex"
        >
          <Link href="/student-demo/elite-club" className="text-[#5b4ce2] hover:underline">باشگاه نخبگان</Link>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club/business-support" className="text-[#5b4ce2] hover:underline">حمایت کسب‌وکار</Link>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <span dir="rtl" className="text-[#6b7280]">جزئیات</span>
        </nav>

        <header dir="ltr" className="flex h-[31px] shrink-0 items-center justify-between gap-2 lg:h-11">
          <StatusBadges status={opportunity.status} />
          <h2 dir="rtl" className="truncate text-right text-[18px] font-bold leading-[31px] text-[#111827] lg:text-[28px] lg:leading-[44px]">
            {opportunity.title}
          </h2>
        </header>

        <InfoLines />

        <div className="flex h-12 shrink-0 justify-center">
          <Link
            href={`/student-demo/elite-club/business-support/${supportId}/interest-submitted`}
            className="inline-flex h-12 w-40 items-center justify-center rounded-xl bg-[#5b4ce2] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#4c3fd0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4ce2]"
          >
            اعلام علاقه‌مندی
          </Link>
        </div>
      </div>
    </StudentShell>
  );
}
