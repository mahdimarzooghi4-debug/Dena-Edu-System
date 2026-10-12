import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { OrganizationPanelAnalytics } from "../../../components/organization/analytics-panels";
import { getServerAccessContext } from "../../../server/access/actor";
import { getOrganizationPanelSnapshot } from "../../../server/organization/analytics";
import { getOrganizationScopes } from "../../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پیگیری‌های سازمان | دنا", robots: { index: false, follow: false },
};

export default async function OrganizationNotificationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "organization")) notFound();
  const scopes = await getOrganizationScopes(actor.userId);
  if (!scopes.length) notFound();
  const snapshot = await getOrganizationPanelSnapshot(scopes);

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/organization" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به خانهٔ سازمان</Link>
        <Link href="/account" className={buttonClassName("secondary")}>حساب من</Link>
      </header>
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">پیگیری بر پایهٔ وضعیت واقعی</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">پیگیری‌های سازمان</h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">یادآوری‌های این صفحه از وضعیت فعلی پرونده‌ها محاسبه می‌شوند؛ اعلان بیرونی یا پیامک ارسال نمی‌شود.</p>
      </section>
      <OrganizationPanelAnalytics snapshot={snapshot} view="notifications" />
    </main>
  );
}
