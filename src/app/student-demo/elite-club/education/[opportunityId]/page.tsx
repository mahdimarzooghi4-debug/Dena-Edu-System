import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const opportunity = {
  slug: "communication-skills",
  title: "کارگاه مهارت‌های ارتباطی",
  domain: "توسعه فردی",
  description: "این کارگاه برای تقویت مهارت‌های ارتباطی و بین‌فردی اعضای باشگاه نخبگان طراحی شده است.",
  provider: "(تعیین‌شده توسط سیستم)",
  format: "(تعیین‌شده توسط سیستم)",
  schedule: "(تعیین‌شده توسط سیستم)",
  conditions: "شرایط شرکت در صورت تعریف در این بخش نمایش داده می‌شود.",
};

function Divider() {
  return (
    <div className="h-px w-full overflow-hidden" aria-hidden="true">
      <img src="/icons/elite-club/divider.svg" width="326" height="1" className="h-px w-full" alt="" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 text-right">
      <p className="text-xs font-semibold text-[#9ca3af] lg:text-sm">{label}</p>
      <div className="text-sm font-semibold leading-[1.6] text-[#1f2937] lg:text-base">{children}</div>
    </div>
  );
}

export default async function EducationalOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  if (opportunityId !== opportunity.slug) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div dir="rtl" className="space-y-4 lg:-mx-10 lg:-mt-10 lg:space-y-4 lg:px-10 lg:pb-10 lg:pt-4">
        <nav aria-label="مسیر صفحه" className="hidden items-center gap-2 text-sm lg:flex">
          <Link href={`/student-demo/elite-club/education/${opportunity.slug}`} className="text-[#5b4ce2]">جزئیات آموزش</Link>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club/education" className="text-[#6b7280] hover:text-[#5b4ce2]">حمایت آموزشی</Link>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club/member" className="text-[#6b7280] hover:text-[#5b4ce2]">باشگاه نخبگان</Link>
        </nav>

        <header className="space-y-2 lg:space-y-0">
          <div dir="ltr" className="flex flex-row-reverse items-center gap-2 lg:hidden">
            <span className="rounded-full bg-[#ededf2] px-3 py-1 text-[11px] font-semibold text-[#737380]">نمونه نمایشی</span>
            <span className="rounded-full bg-[#e8f8f0] px-3 py-1 text-[11px] font-semibold text-[#10b981]">فعال</span>
          </div>
          <h2 className="text-right text-xl font-bold leading-normal text-[#111827] lg:hidden">
            {opportunity.title}
          </h2>
          <div dir="ltr" className="hidden items-center justify-between lg:flex">
            <span className="rounded-full bg-[#e8f8f0] px-4 py-1.5 text-[13px] font-semibold text-[#10b981]">فعال</span>
            <span className="rounded-full bg-[#ededf2] px-4 py-1.5 text-[13px] font-semibold text-[#737380]">نمونه نمایشی</span>
            <h2 dir="rtl" className="text-right text-[28px] font-bold leading-normal text-[#111827]">{opportunity.title}</h2>
          </div>
        </header>

        <section aria-label="اطلاعات آموزش" className="space-y-3 rounded-[20px] border border-[#e5e1ed] bg-white p-4 lg:space-y-4 lg:p-6">
          <Field label="حوزه آموزش">{opportunity.domain}</Field>
          <Divider />
          <Field label="ارائه‌دهنده">{opportunity.provider}</Field>
          <Divider />
          <Field label="شیوه برگزاری">{opportunity.format}</Field>
          <Divider />
          <div className="hidden lg:block">
            <Field label="زمان‌بندی">{opportunity.schedule}</Field>
          </div>
          <Field label="توضیحات">
            <span className="font-normal text-[#374151]">{opportunity.description}</span>
          </Field>
          <Divider />
          <Field label="شرایط شرکت">
            <span className="font-normal text-[#6b7280]">{opportunity.conditions}</span>
          </Field>
        </section>

        <div className="flex flex-col items-center gap-3 pt-1">
          <Link
            href={`/student-demo/elite-club/education/${opportunity.slug}/request-submitted`}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#5b4ce2] px-6 text-[15px] font-medium text-white hover:bg-[#4c3fd0] lg:w-40"
          >
            ثبت‌نام در آموزش
          </Link>
          <p className="text-center text-xs leading-5 text-[#9ca3af] lg:text-[13px]">
            این آموزش‌ها مستقل از دوره‌های درسی دانش‌آموز هستند.
          </p>
        </div>
      </div>
    </StudentShell>
  );
}
