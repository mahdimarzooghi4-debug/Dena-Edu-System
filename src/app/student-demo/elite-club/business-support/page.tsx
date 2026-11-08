import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const opportunities = [
  {
    id: "sample-one",
    title: "فرصت کسب‌وکار نمونه",
    status: "فعال",
    statusClass: "bg-[#e8f8f0] text-[#10b981]",
  },
  {
    id: "sample-two",
    title: "فرصت کسب‌وکار نمونه ۲",
    status: "به‌زودی",
    statusClass: "bg-[#fffbeb] text-[#d97706]",
  },
] as const;

function StatusGroup({ opportunity }: { opportunity: (typeof opportunities)[number] }) {
  return (
    <div dir="ltr" className="flex shrink-0 items-center gap-1.5 lg:gap-2">
      <span className="inline-flex items-center rounded-full bg-[#ededf2] px-2.5 py-1 text-[11px] font-semibold leading-[17px] text-[#737380] lg:px-4 lg:py-1.5 lg:text-[13px] lg:leading-5">
        نمونه نمایشی
      </span>
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-[17px] lg:px-4 lg:py-1.5 lg:text-[13px] lg:leading-5 ${opportunity.statusClass}`}>
        {opportunity.status}
      </span>
    </div>
  );
}

function DetailsLink({ opportunity }: { opportunity: (typeof opportunities)[number] }) {
  if (opportunity.id === "sample-two") {
    return <span className="text-[13px] font-semibold text-[#5b4ce2]">مشاهده جزئیات ←</span>;
  }

  return (
    <Link
      href={`/student-demo/elite-club/business-support/${opportunity.id}`}
      className="text-[13px] font-semibold text-[#5b4ce2] hover:underline"
    >
      مشاهده جزئیات ←
    </Link>
  );
}

export default function StudentBusinessSupportPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div dir="rtl" className="space-y-6">
        <nav dir="ltr" aria-label="مسیر صفحه" className="flex h-5 items-center justify-end gap-2 whitespace-nowrap">
          <span dir="rtl" className="text-[13px] text-[#6b7280] lg:text-sm">حمایت کسب‌وکار</span>
          <span aria-hidden="true" className="text-xs text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club" className="text-[13px] text-[#5b4ce2] hover:underline lg:text-sm">
            باشگاه نخبگان
          </Link>
        </nav>

        <header className="flex flex-col gap-1.5 text-right lg:gap-2">
          <h2 className="text-[22px] font-bold leading-[34px] text-[#111827] lg:text-[28px] lg:leading-[44px]">
            حمایت کسب‌وکار
          </h2>
          <p className="text-sm leading-[22px] text-[#6b7280] lg:text-base lg:leading-[25px]">
            فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.
          </p>
        </header>

        <ul className="flex flex-col gap-3 lg:gap-4">
          {opportunities.map((opportunity) => (
            <li key={opportunity.id} className="shrink-0">
              <Card
                aria-label={opportunity.title}
                className="h-[89px] rounded-[20px] border-[#e5e1ed] px-4 py-3.5 shadow-[0px_4px_8px_rgba(0,0,0,0.03)] lg:h-[110px] lg:px-6 lg:py-6"
              >
                <div className="flex h-full flex-col justify-between lg:hidden">
                  <div dir="ltr" className="flex min-w-0 items-center justify-between gap-2">
                    <StatusGroup opportunity={opportunity} />
                    <h3 dir="rtl" className="truncate text-right text-[15px] font-bold leading-6 text-[#1f2937]">
                      {opportunity.title}
                    </h3>
                  </div>
                  <div dir="ltr" className="flex h-5 items-center">
                    <DetailsLink opportunity={opportunity} />
                  </div>
                </div>

                <div dir="ltr" className="hidden h-full w-full items-center justify-between lg:flex">
                  <div dir="ltr" className="flex items-center gap-5">
                    <DetailsLink opportunity={opportunity} />
                    <StatusGroup opportunity={opportunity} />
                  </div>
                  <h3 dir="rtl" className="text-right text-[18px] font-bold leading-7 text-[#1f2937]">
                    {opportunity.title}
                  </h3>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <p className="text-center text-[11px] leading-[19px] text-[#9ca3af] lg:text-[13px] lg:leading-[22px]">
          فرصت‌ها و حمایت‌های جدید پس از انتشار در این بخش نمایش داده می‌شوند.
        </p>
      </div>
    </StudentShell>
  );
}
