import Link from "next/link";
import Image from "next/image";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default function StudentTeachingSupportPage() {
  return <StudentShell active="elite" title="باشگاه نخبگان">
    <div dir="rtl" className="mx-auto w-full max-w-[720px] space-y-5">
      <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-xs text-dena-muted">
        <span className="font-semibold text-dena-brand">حمایت تدریس</span>
        <span aria-hidden="true">‹</span>
        <Link href="/student/elite-club" className="hover:text-dena-brand">باشگاه نخبگان</Link>
      </nav>
      <header className="space-y-1.5 text-right">
        <h2 className="text-xl font-extrabold text-dena-deep md:text-[28px]">فرصت‌های پشتیبانی تحصیلی</h2>
        <p className="text-xs leading-6 text-dena-muted md:text-sm">فرصت‌های فعال همکاری آموزشی در این بخش نمایش داده می‌شوند.</p>
      </header>

      <article className="space-y-4 rounded-[20px] border border-dena-border bg-white p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 rounded-full bg-[#e8f8f0] px-3 py-1 text-[11px] font-bold text-[#13845f]">فرصت فعال</span>
          <h3 className="text-right text-sm font-extrabold text-dena-deep md:text-base">پشتیبان تحصیلی ریاضی</h3>
        </div>
        <div className="space-y-2 border-b border-dena-border pb-4 text-right text-xs text-dena-muted">
          <p className="flex items-center justify-start gap-2"><Image src="/figma/elite-club/map-pin.svg" alt="" width={16} height={16} />آموزشگاه البرز</p>
          <p className="flex items-center justify-start gap-2"><Image src="/figma/elite-club/book-open.svg" alt="" width={16} height={16} />درس: ریاضی دهم</p>
        </div>
        <Link href="/student/elite-club/teaching-support/alborz-math-10" className="inline-flex items-center gap-2 text-xs font-bold text-dena-brand hover:underline">
          مشاهده جزئیات <Image src="/figma/elite-club/arrow-left.svg" alt="" width={16} height={16} />
        </Link>
      </article>

      <p className="flex items-center justify-between gap-2 rounded-xl bg-dena-lavender px-4 py-3 text-[11px] leading-5 text-dena-muted">
        سایر فرصت‌ها پس از انتشار نمایش داده می‌شوند.
        <span aria-hidden="true" className="font-bold text-dena-brand">ⓘ</span>
      </p>
    </div>
  </StudentShell>;
}
