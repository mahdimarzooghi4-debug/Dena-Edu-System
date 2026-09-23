import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getAdminReviewOverview } from "../../server/admin/dashboard";
import { getAdminOverview } from "../../server/admin/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه مدیر | دنا",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();

  const [{ pendingCount, pending, hasMore }, overview] = await Promise.all([
    getAdminReviewOverview(),
    getAdminOverview(),
  ]);

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/account" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حساب من
        </Link>
        <Link href="/admin/role-applications" className={buttonClassName("secondary")}>
          صف بررسی درخواست‌های نقش
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه مدیر دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          نمای کلی سیستم
        </h1>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="آمار مدیر">
        {Object.entries(overview.users).map(([role, total]) => (
          <Card key={role}>
            <p className="text-sm text-dena-muted">{role}</p>
            <p className="mt-2 text-2xl font-extrabold">{total.toLocaleString("fa-IR")}</p>
          </Card>
        ))}
        <Card>
          <p className="text-sm text-dena-muted">دوره‌ها</p>
          <p className="mt-2 text-2xl font-extrabold">{overview.courses.total.toLocaleString("fa-IR")}</p>
        </Card>
      </section>

      <section aria-labelledby="admin-pending" className="space-y-4">
        <SectionHeading id="admin-pending">صف بررسی درخواست‌ها</SectionHeading>
        <Card>
          <p className="text-sm text-dena-muted">در انتظار بررسی</p>
          <p className="mt-2 text-2xl font-extrabold">{pendingCount.toLocaleString("fa-IR")}</p>
        </Card>
        {pending.length > 0 && (
          <p className="text-sm text-dena-muted">نمایش {pending.length} پروندهٔ نخست از صف. {hasMore ? "موارد بیشتری وجود دارد." : ""}</p>
        )}
      </section>
    </main>
  );
}
