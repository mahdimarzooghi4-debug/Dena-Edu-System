import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import { getOrganizationScopes } from "../../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "رشد و پیشرفت | دنا",
  robots: { index: false, follow: false },
};

export default async function OrganizationGrowthPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "organization")) {
    notFound();
  }
  const scopes = await getOrganizationScopes(actor.userId);
  if (!scopes.length) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/organization" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ سازمان
        </Link>
        <Link href="/account" className={buttonClassName("secondary")}>
          حساب من
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">گزارش حافظ حریم خصوصی</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          رشد و پیشرفت
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          نتیجهٔ آموزشی فردی دانش‌آموزان در اختیار سازمان قرار نمی‌گیرد.
          شاخص تجمیعیِ مصوبی برای این نقش تعریف نشده است؛ بنابراین
          نمودار یا شمار پیشرفت در این نسخه نمایش داده نمی‌شود.
        </p>
      </section>

      <Card className="space-y-4">
        <h2 className="text-lg font-extrabold">گزارش پیشرفت هنوز فعال نشده است</h2>
        <p className="text-sm leading-8 text-dena-muted">
          این صفحه تلاش‌ها، نمره‌ها، نام دانش‌آموزان یا جمع‌های آماریِ تأییدنشده
          را نمی‌خواند و نمایش نمی‌دهد. گزارش استفادهٔ سازمان نیز تا اتصال دادهٔ
          واقعی در بخش گزارش‌ها در دسترس نیست.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/organization" className={buttonClassName()}>
            خانهٔ سازمان
          </Link>
          <Link href="/organization/reports" className={buttonClassName("secondary")}>
            گزارش‌های سازمان
          </Link>
        </div>
      </Card>
    </main>
  );
}
