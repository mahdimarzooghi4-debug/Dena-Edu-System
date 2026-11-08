import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const allowedOpportunity = "communication-skills";

export default async function EducationalRequestNotEligiblePage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (opportunityId !== allowedOpportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <section
        dir="rtl"
        className="mx-auto flex min-h-[calc(100svh-198px)] w-full max-w-[390px] flex-col items-center justify-center px-2 text-center"
        aria-labelledby="education-not-eligible-title"
      >
        <div className="flex w-full flex-col items-center gap-6">
          <div className="grid size-20 shrink-0 place-items-center rounded-[40px] bg-[#ededf2]">
            <img src="/icons/elite-club/info.svg" width="36" height="32" alt="" />
          </div>

          <div className="w-full space-y-3">
            <h2 id="education-not-eligible-title" className="text-lg font-bold leading-normal text-[#2b2544]">
              شرایط شرکت فراهم نیست
            </h2>
            <p className="text-[13px] leading-[22px] text-[#756f83]">
              در حال حاضر شرایط شرکت در این آموزش برای شما فراهم نیست.
            </p>
          </div>
        </div>
      </section>
    </StudentShell>
  );
}
