import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const allowedOpportunity = "communication-skills";

export default async function EducationalRequestPendingPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (opportunityId !== allowedOpportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <section className="mx-auto flex min-h-[calc(100svh-198px)] w-full max-w-[430px] items-center justify-center lg:min-h-[calc(100svh-160px)]" aria-labelledby="request-pending-title">
        <div className="flex w-full flex-col items-center gap-6 px-2 text-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-[40px] bg-[#fffbeb]">
            <img src="/icons/elite-club/clock.svg" width="36" height="32" alt="" />
          </div>
          <div className="w-full space-y-3">
            <h2 id="request-pending-title" className="text-lg font-bold leading-normal text-[#2b2544]">
              در انتظار بررسی
            </h2>
            <p className="text-[13px] leading-[22px] text-[#756f83]">
              درخواست شما در حال بررسی است.
            </p>
          </div>
        </div>
      </section>
    </StudentShell>
  );
}
