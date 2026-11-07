import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default async function WelfareSupportNotEligiblePage({
  params,
}: {
  params: Promise<{ supportId: string }>;
}) {
  const { supportId } = await params;
  if (supportId !== "sample-one") notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div
        dir="rtl"
        className="mt-6 flex min-h-[calc(100svh-198px)] flex-col gap-4 p-4 lg:mt-0 lg:min-h-0 lg:gap-6 lg:p-0"
      >
        <nav dir="ltr" aria-label="مسیر صفحه" className="flex h-5 shrink-0 items-center justify-end gap-2 whitespace-nowrap">
          <span dir="rtl" className="text-[13px] text-[#6b7280] lg:text-sm">حمایت رفاهی</span>
          <span aria-hidden="true" className="text-xs text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club" className="text-[13px] text-[#5b4ce2] hover:underline lg:text-sm">
            باشگاه نخبگان
          </Link>
        </nav>

        <header className="flex shrink-0 flex-col gap-1.5 text-right lg:gap-2">
          <h2 className="text-[22px] font-bold leading-[34px] text-[#111827] lg:text-[28px] lg:leading-[44px]">
            حمایت رفاهی
          </h2>
          <p className="text-sm leading-[22px] text-[#6b7280] lg:text-base lg:leading-[25px]">
            خدمات و حمایت‌های رفاهی تعریف‌شده برای اعضای باشگاه.
          </p>
        </header>

        <section aria-label="وضعیت شرایط استفاده" className="flex min-h-[500px] flex-1 items-center justify-center">
          <div className="flex h-[228px] w-full flex-col items-center gap-5 rounded-[20px] border border-[#e5e1ed] bg-white px-6 py-8 text-center shadow-[0px_4px_8px_rgba(0,0,0,0.03)] lg:max-w-[520px]">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#f4f4f5]">
              <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 text-[#4b5563]" fill="none">
                <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 14.5v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="16" cy="10.5" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              <h3 className="w-full text-[18px] font-bold leading-normal text-[#1f2937]">
                در حال حاضر قابل استفاده نیست
              </h3>
              <p className="w-full text-[13px] leading-[22px] text-[#6b7280]">
                در حال حاضر شرایط استفاده از این حمایت برای شما فراهم نیست.
              </p>
            </div>
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
