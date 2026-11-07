import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const demoSupport = {
  "sample-one": {
    title: "خدمت رفاهی نمونه",
    status: "فعال",
    type: "(تعیین‌شده توسط سیستم)",
    provider: "(تعیین‌شده توسط سیستم)",
    description: "توضیحات این حمایت در صورت تعریف در این بخش نمایش داده می‌شود.",
    conditions: "شرایط استفاده در صورت تعریف در این بخش نمایش داده می‌شود.",
    instructions: "نحوه استفاده در صورت تعریف در این بخش نمایش داده می‌شود.",
  },
} as const;

function StatusBadges({ status }: { status: string }) {
  return (
    <div dir="ltr" className="flex shrink-0 items-center gap-1.5 lg:gap-2">
      <span className="inline-flex h-[25px] items-center rounded-full bg-[#ededf2] px-3 text-[11px] font-semibold leading-[17px] text-[#737380] lg:h-8 lg:px-4 lg:text-[13px] lg:leading-5">
        نمونه نمایشی
      </span>
      <span className="inline-flex h-[25px] items-center rounded-full bg-[#e8f8f0] px-3 text-[11px] font-semibold leading-[17px] text-[#10b981] lg:h-8 lg:px-4 lg:text-[13px] lg:leading-5">
        {status}
      </span>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="shrink-0 space-y-1.5 text-right lg:space-y-2">
      <p className="text-[13px] font-semibold leading-5 text-[#9ca3af] lg:text-sm lg:leading-[22px]">{label}</p>
      <p className="text-[15px] font-normal leading-[22px] text-[#1f2937] lg:text-base lg:leading-[25px]">{value}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative h-0 w-full shrink-0" aria-hidden="true">
      <img src="/icons/elite-club/divider.svg" width="326" height="1" className="absolute inset-x-0 top-0 h-px w-full" alt="" />
    </div>
  );
}

export default async function StudentWelfareSupportDetailPreviewPage({
  params,
}: {
  params: Promise<{ supportId: string }>;
}) {
  const { supportId } = await params;
  const support = demoSupport[supportId as keyof typeof demoSupport];
  if (!support) notFound();

  const fields = [
    ["نوع حمایت", support.type],
    ["ارائه‌دهنده", support.provider],
    ["توضیحات", support.description],
    ["شرایط استفاده", support.conditions],
    ["نحوه استفاده", support.instructions],
  ];

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div
        dir="rtl"
        className="mt-6 flex flex-col gap-4 p-4 lg:-mx-10 lg:-mt-10 lg:gap-4 lg:px-10 lg:pb-10 lg:pt-4"
      >
        <nav
          dir="ltr"
          aria-label="مسیر صفحه"
          className="flex h-5 shrink-0 items-center justify-end gap-2 whitespace-nowrap lg:h-[22px] lg:justify-start"
        >
          <span dir="rtl" className="text-[13px] text-[#6b7280] lg:text-sm">جزئیات حمایت</span>
          <span aria-hidden="true" className="text-xs text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club/welfare-support" className="text-[13px] text-[#6b7280] hover:text-[#5b4ce2] lg:text-sm">
            حمایت رفاهی
          </Link>
          <span aria-hidden="true" className="text-xs text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club" className="text-[13px] text-[#5b4ce2] hover:underline lg:text-sm">
            باشگاه نخبگان
          </Link>
        </nav>

        <header dir="ltr" className="flex h-[34px] shrink-0 items-center justify-between gap-2 lg:h-11">
          <StatusBadges status={support.status} />
          <h2 dir="rtl" className="truncate text-right text-[22px] font-bold leading-[34px] text-[#1f2937] lg:text-[28px] lg:leading-[44px]">
            {support.title}
          </h2>
        </header>

        <Card
          aria-label={support.title}
          className="flex h-[435px] shrink-0 flex-col gap-3 overflow-clip rounded-[20px] border-[#e5e1ed] p-5 shadow-[0px_4px_16px_rgba(0,0,0,0.03)] lg:h-[454px] lg:gap-4 lg:p-6"
        >
          {fields.map(([label, value]) => (
            <div key={label} className="contents">
              <InfoField label={label} value={value} />
              {label !== "نحوه استفاده" && <Divider />}
            </div>
          ))}
        </Card>

        <div className="flex shrink-0 flex-col items-center gap-[10px]">
          <Link
            href={`/student-demo/elite-club/welfare-support/${supportId}/request-submitted`}
            className="inline-flex h-12 w-40 items-center justify-center rounded-xl bg-[#5b4ce2] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#4c3fd0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4ce2]"
          >
            درخواست حمایت
          </Link>
          <p className="text-center text-xs leading-normal text-[#9ca3af]">
            نوع اقدام بسته به نوع حمایت متفاوت است. (نمونه: نیازمند درخواست)
          </p>
        </div>
      </div>
    </StudentShell>
  );
}
