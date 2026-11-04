import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const allowedOpportunity = "communication-skills";

export default async function EducationalRequestActivePage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (opportunityId !== allowedOpportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <section
        dir="rtl"
        className="mx-auto flex min-h-[calc(100svh-198px)] w-full max-w-[390px] items-center justify-center"
        aria-labelledby="education-active-title"
      >
        <div className="flex w-full flex-col items-center gap-6 px-2 text-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-[40px] bg-[rgba(91,76,226,0.1)]">
            <img src="/icons/elite-club/award.svg" width="36" height="32" alt="" />
          </div>

          <div className="w-full space-y-3">
            <h2 id="education-active-title" className="text-lg font-bold leading-normal text-[#2b2544]">
              پیش‌نمایش وضعیت فعال آموزش
            </h2>
            <p className="text-[13px] leading-[22px] text-[#756f83]">
              جزئیات آموزش و اطلاعات تکمیلی در این صفحه نمایش داده می‌شود.
            </p>
          </div>

          <Link
            href={`/student/elite-club/educational-support/${opportunityId}`}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#5b4ce2] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#4c3fd0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4ce2]"
          >
            ورود به دوره آموزشی
          </Link>
        </div>
      </section>
    </StudentShell>
  );
}
