import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پیگیری یادگیری | دنا",
  robots: { index: false, follow: false },
};

export default async function ProviderLearningPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "provider")) {
    notFound();
  }

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/provider" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ ارائه‌دهنده
        </Link>
        <Link href="/account" className={buttonClassName("secondary")}>
          حساب من
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">حریم خصوصی یادگیری</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          پیگیری یادگیری دانش‌آموزان
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          جزئیات تلاش و پاسخ دانش‌آموزان در اختیار ارائه‌دهنده قرار نمی‌گیرد.
          در این نسخه گزارش تجمیعی هم تعریف نشده است؛ بنابراین این صفحه هیچ
          نتیجه، نمودار یا شمار یادگیری نمایش نمی‌دهد.
        </p>
      </section>

      <Card className="space-y-4">
        <h2 className="text-lg font-extrabold">کارهای در دسترس ارائه‌دهنده</h2>
        <p className="text-sm leading-8 text-dena-muted">
          می‌توانید وضعیت محتوای دوره و ارزیابی‌های آن را ببینید؛ این اطلاعات
          شامل تلاش‌ها یا نتایج فردی دانش‌آموزان نیست.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/provider/courses" className={buttonClassName()}>
            فهرست دوره‌ها
          </Link>
          <Link href="/provider/assessments" className={buttonClassName("secondary")}>
            ارزیابی‌های دوره
          </Link>
        </div>
      </Card>
    </main>
  );
}
