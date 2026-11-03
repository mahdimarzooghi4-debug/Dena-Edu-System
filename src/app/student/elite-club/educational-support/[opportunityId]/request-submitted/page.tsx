import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const allowedOpportunity = "communication-skills";

export default async function EducationalRequestSubmittedPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (opportunityId !== allowedOpportunity) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <section className="mx-auto flex min-h-[calc(100svh-198px)] w-full max-w-[430px] items-center justify-center lg:min-h-[calc(100svh-160px)]" aria-labelledby="request-submitted-title">
        <div className="flex w-full flex-col items-center gap-6 px-2 text-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-[40px] bg-[#e8f8f0]">
            <img src="/icons/elite-club/check-circle.svg" width="36" height="32" alt="" />
          </div>
          <div className="w-full space-y-3">
            <h2 id="request-submitted-title" className="text-lg font-bold leading-normal text-[#2b2544]">
              پیش‌نمایش: درخواست ثبت شد
            </h2>
            <p className="text-[13px] leading-[22px] text-[#756f83]">
              این فقط پیش‌نمایش صفحه است؛ درخواست واقعی ذخیره یا ارسال نشده است.
            </p>
          </div>
          <Link
            href={`/student/elite-club/educational-support/${opportunityId}/pending`}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#5b4ce2] px-6 text-[15px] font-medium text-white hover:bg-[#4c3fd0]"
          >
            فهمیدم
          </Link>
        </div>
      </section>
    </StudentShell>
  );
}
