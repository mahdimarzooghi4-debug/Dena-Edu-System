import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "../../../components/ui/card";
import { RoleReviewQueue } from "../../../components/admin/role-review-queue";
import { AdminShell } from "../../../components/admin/admin-shell";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "بررسی درخواست نقش | دنا", robots: { index: false, follow: false },
};

export default async function AdminRoleReviewPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "admin")) notFound();
  const canHandleSupport = actor.memberships.some((membership) =>
    membership.role === "admin" && membership.canHandleTechnicalSupport,
  );
  return (
    <AdminShell active="role-applications" canHandleSupport={canHandleSupport}>
    <main id="main-content" className="mx-auto min-h-screen max-w-7xl px-5 py-6 md:px-8">
      <Card className="rounded-xl p-5 md:p-6">
        <p className="text-sm font-bold text-dena-brand">مدیریت / درخواست‌های نقش</p>
        <h1 className="mt-3 text-2xl font-extrabold">درخواست‌های نقش سازمانی</h1>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          درخواست‌ها را بررسی کنید و نتیجه را همراه با دلیل ثبت کنید.
          هیچ کاربری نمی‌تواند درخواست خودش را تأیید کند.
        </p>
        <RoleReviewQueue />
      </Card>
    </main>
    </AdminShell>
  );
}
