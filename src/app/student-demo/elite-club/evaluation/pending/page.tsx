import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default function EliteClubEvaluationPendingPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <section
        className="flex min-h-[65vh] w-full flex-col items-center justify-center gap-4 px-5 py-10 text-center"
        dir="rtl"
        aria-labelledby="evaluation-pending-title"
      >
        <h2 id="evaluation-pending-title" className="text-[22px] font-extrabold leading-normal text-[#241f2e] md:text-[28px]">
          باشگاه نخبگان
        </h2>
        <p className="text-sm leading-6 text-[#757082] md:text-base">
          فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.
        </p>
        <p className="pt-2 text-sm leading-6 text-[#757082]">
          ارزیابی عضویت شما هنوز تکمیل نشده است.
        </p>
        <div className="w-full max-w-[500px] space-y-2 rounded-xl border border-[#f2e0b2] bg-[#fffaed] p-5 text-[#757082] md:p-6">
          <h3 className="text-[15px] font-bold leading-normal text-[#241f2e] md:text-base">
            در حال ارزیابی
          </h3>
          <p className="text-[13px] leading-6 md:text-sm">
            ثبت‌نام شما انجام شده و ارزیابی عضویت در حال انجام است.
            <br />
            پس از تکمیل ارزیابی، نتیجه در همین بخش نمایش داده می‌شود.
          </p>
        </div>
        <p className="pt-1 text-xs leading-6 text-amber-800">
          این وضعیت نمونه است و به پروندهٔ واقعی متصل نیست.
        </p>
      </section>
    </StudentShell>
  );
}
