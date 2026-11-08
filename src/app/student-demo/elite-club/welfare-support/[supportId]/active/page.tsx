import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default async function WelfareSupportActivePage({
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

        <section aria-label="وضعیت حمایت رفاهی" className="flex min-h-[500px] flex-1 items-center justify-center">
          <div className="flex h-[274px] w-full flex-col items-center gap-5 rounded-[20px] border border-[#e5e1ed] bg-white px-6 py-8 text-center shadow-[0px_4px_8px_rgba(0,0,0,0.03)] lg:max-w-[520px]">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#d1fae5]">
              <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 text-[#059669]" fill="none">
                <path d="M16 3.5 26 7v8.2c0 6.1-4.1 10.8-10 13.3-5.9-2.5-10-7.2-10-13.3V7l10-3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m12 15.8 2.7 2.7 5.4-5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              <h3 className="w-full text-[18px] font-bold leading-normal text-[#1f2937]">
                حمایت فعال است
              </h3>
              <p className="w-full text-[13px] leading-[22px] text-[#6b7280]">
                این حمایت برای شما فعال است.
              </p>
            </div>
            <div className="flex w-full justify-center">
              <Link
                href={`/student-demo/elite-club/welfare-support/${supportId}`}
                className="inline-flex h-12 w-40 items-center justify-center rounded-xl bg-[#5b4ce2] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#4c3fd0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4ce2]"
              >
                مشاهده جزئیات
              </Link>
            </div>
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
