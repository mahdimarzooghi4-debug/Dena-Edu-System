import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const opportunityId = "alborz-math-10";

export default async function TeachingOpportunityDetailPage({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId: requestedId } = await params;
  if (requestedId !== opportunityId) notFound();

  const fields = [
    { label: "عنوان فرصت همکاری", value: "پشتیبان تحصیلی ریاضی دهم", strong: true },
    { label: "آموزشگاه همکار", value: "آموزشگاه البرز" },
    { label: "حوزه آموزشی", value: "پایه دهم دوره دوم متوسطه" },
    { label: "توضیحات فرصت", value: "این فرصت برای اعضای باشگاه نخبگان جهت فعالیت به‌عنوان پشتیبان تحصیلی در آموزشگاه البرز تعریف شده است.", body: true },
    { label: "شرایط همکاری", value: "شرایط همکاری در صورت تعریف توسط آموزشگاه در این بخش نمایش داده می‌شود.", body: true },
  ];

  return <StudentShell active="elite" title="جزئیات فرصت">
    <div dir="rtl" className="mx-auto w-full max-w-[720px] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 rounded-full bg-[#e8f8f0] px-2.5 py-1 text-xs font-semibold text-[#13845f]">فرصت فعال</span>
        <h2 className="flex items-center gap-2 text-base font-extrabold text-dena-deep md:text-lg">
          <Link href="/student/elite-club/teaching-support" aria-label="بازگشت به فرصت‌ها" className="text-dena-brand"><Image src="/figma/elite-club/arrow-left.svg" alt="" width={16} height={16} /></Link>
          جزئیات فرصت
        </h2>
      </div>

      <section aria-label="جزئیات فرصت پشتیبانی تحصیلی" className="space-y-4 rounded-[20px] border border-dena-border bg-white p-[18px]">
        {fields.map((field, index) => <div key={field.label} className={index < fields.length - 1 ? "border-b border-dena-border pb-4" : ""}>
          <p className="text-xs leading-5 text-dena-muted">{field.label}</p>
          <p className={`mt-1 text-right leading-6 text-dena-deep ${field.body ? "text-[13px]" : field.strong ? "text-lg font-bold" : "text-[15px] font-semibold"}`}>
            {field.value}
          </p>
        </div>)}
        <p className="text-[11px] leading-5 text-dena-muted">نمونهٔ نمایشی فیگماست؛ علاقه‌مندی در پروندهٔ واقعی ثبت نمی‌شود.</p>
      </section>

      <Link href="/student/elite-club/teaching-support/alborz-math-10/interest-submitted" className="mx-auto flex h-12 w-full max-w-sm items-center justify-center rounded-xl bg-dena-brand px-6 py-3 text-sm font-bold text-white">
        اعلام علاقه‌مندی
      </Link>
      <p className="text-center text-xs leading-5 text-dena-muted">اعلام علاقه‌مندی به معنای تأیید همکاری نیست.</p>
    </div>
  </StudentShell>;
}
