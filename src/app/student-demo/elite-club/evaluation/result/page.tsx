import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";
import { buttonClassName } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function EliteClubEvaluationResultPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <section
        dir="rtl"
        className="w-full space-y-4 bg-[#f7f6fb] p-4"
        aria-labelledby="club-result-title"
      >
        <header className="space-y-1">
          <h2 id="club-result-title" className="text-xl font-bold leading-normal text-[#2b2544]">
            باشگاه نخبگان
          </h2>
          <p className="text-[13px] leading-5 text-[#756f83]">
            فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-[#e5e1ed] bg-white p-4" aria-labelledby="club-status-title">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#eaf9f5] px-3 py-1 text-[11px] font-bold text-[#42cfa7]">
              واجد شرایط
            </span>
            <h3 id="club-status-title" className="text-[15px] font-bold leading-6 text-[#2b2544]">
              وضعیت من در باشگاه
            </h3>
          </div>
          <p className="text-right text-[13px] leading-5 text-[#756f83]">
            براساس اطلاعات فعلی، شرایط لازم برای ادامه فرایند عضویت را داری.
          </p>
        </section>

        <div className="pt-2">
          <Link
            href="/student-demo/elite-club/member"
            className={buttonClassName()}
          >
            مشاهده جزئیات عضویت
          </Link>
        </div>

        <p className="pt-1 text-center text-xs leading-6 text-amber-800">
          این نتیجه نمونه است و عضویت واقعی یا داده‌ای ثبت نشده است.
        </p>
      </section>
    </StudentShell>
  );
}
