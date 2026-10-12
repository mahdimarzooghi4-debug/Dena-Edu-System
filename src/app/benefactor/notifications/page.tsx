import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import { getBenefactorScopes } from "../../../server/benefactor/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "اعلان‌ها | دنا",
  robots: { index: false, follow: false },
};

export default async function BenefactorNotificationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "benefactor")) {
    notFound();
  }
  const scopes = await getBenefactorScopes(actor.userId);
  if (!scopes.length) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/benefactor" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ خیر و حامی
        </Link>
        <Link href="/account" className={buttonClassName("secondary")}>
          حساب من
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">به‌روزرسانی‌های حساب</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          اعلان‌ها
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          اعلان‌های مربوط به صندوق و کمک‌ها پس از اتصال گردش‌کارهای واقعی در این بخش نمایش داده می‌شوند.
        </p>
      </section>

      <Card className="space-y-4">
        <h2 className="text-lg font-extrabold">سامانهٔ اعلان خیر هنوز فعال نشده است</h2>
        <p className="text-sm leading-8 text-dena-muted">
          هنوز رویداد عملیاتیِ صندوق، پرداخت یا تخصیص در سامانه ثبت نمی‌شود؛
          در نتیجه اعلان واقعی برای نمایش وجود ندارد. این صفحه اعلان آزمایشی
          یا وضعیت ساختگی تولید نمی‌کند.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/benefactor" className={buttonClassName()}>
            خانهٔ خیر و حامی
          </Link>
          <Link href="/benefactor/reports" className={buttonClassName("secondary")}>
            وضعیت گزارش‌های صندوق
          </Link>
        </div>
      </Card>
    </main>
  );
}
