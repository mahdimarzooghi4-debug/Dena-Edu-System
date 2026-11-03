import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default async function TeachingInterestPreviewPage({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId } = await params;
  if (opportunityId !== "alborz-math-10") notFound();
  return <StudentShell active="elite" title="حمایت تدریس">
    <section dir="rtl" className="mx-auto flex min-h-[min(600px,calc(100svh-220px))] w-full max-w-[520px] flex-col items-center justify-center gap-5 text-center">
      <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-[#d9f8ef] text-3xl font-bold text-[#24886b]">✓</span>
      <h2 className="text-lg font-extrabold text-dena-deep">پیش‌نمایش اعلام علاقه‌مندی</h2>
      <p className="text-sm leading-7 text-dena-muted">درخواست واقعی به آموزشگاه ارسال نشده و در پروندهٔ دانش‌آموز ثبت نشده است.</p>
      <Link href="/student/elite-club/teaching-support" className="rounded-xl bg-dena-brand px-6 py-3 text-sm font-bold text-white">بازگشت به فرصت‌ها</Link>
    </section>
  </StudentShell>;
}
