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
  title: "گزارش‌های سازمان | دنا",
  robots: { index: false, follow: false },
};

export default async function OrganizationReportsPage() {
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
        <p className="text-sm font-bold text-dena-brand">گزارش‌های سازمان</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          گزارش استفاده و تخصیص
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          گزارش‌های عملیاتی پس از اتصال عضویت‌ها، تخصیص دوره و سفارش به سامانه در این بخش قرار می‌گیرند.
        </p>
      </section>

      <Card className="space-y-4">
        <h2 className="text-lg font-extrabold">گزارش سازمان هنوز فعال نشده است</h2>
        <p className="text-sm leading-8 text-dena-muted">
          در این نسخه گزارش استفاده، تخصیص، سفارش یا صورتحساب از بک‌اند خوانده نمی‌شود.
          بنابراین عدد یا نمودار ساختگی نمایش داده نخواهد شد؛ اطلاعات فردی دانش‌آموزان
          نیز در این مسیر ارائه نمی‌شود.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/organization" className={buttonClassName()}>
            خانهٔ سازمان
          </Link>
          <Link href="/organization/notifications" className={buttonClassName("secondary")}>
            اعلان‌ها
          </Link>
        </div>
      </Card>
    </main>
  );
}
