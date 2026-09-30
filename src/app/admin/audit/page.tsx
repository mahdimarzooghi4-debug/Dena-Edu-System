import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گزارش رویدادها | دنا",
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-10">
      <h1 className="text-3xl font-extrabold text-dena-deep">رویدادهای سیستم</h1>
      <Card>
        <h2 className="text-lg font-extrabold">در حال آماده‌سازی</h2>
        <p className="mt-3 text-sm leading-8 text-dena-muted">
          نمایش Audit Log تا ثبت migration رسمی و سیاست نگهداری رویدادها
          فعال نمی‌شود. این صفحه داده ساختگی یا تاریخچه ناقص نمایش نمی‌دهد.
        </p>
      </Card>
    </main>
  );
}
