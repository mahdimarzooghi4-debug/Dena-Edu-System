import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "../../../components/ui/card";
import { RoleReviewQueue } from "../../../components/admin/role-review-queue";
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
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-5 py-8 md:py-14">
      <Link href="/account" className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به حساب من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">پنل محدود بررسی هویت</p>
        <h1 className="mt-3 text-2xl font-extrabold">درخواست‌های نقش سازمانی</h1>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          این صفحه فقط برای نشست ادمین معتبر است و جایگزین پنل کامل ادمین نیست.
          هیچ کاربری نمی‌تواند درخواست خودش را تأیید کند.
        </p>
        <RoleReviewQueue />
      </Card>
    </main>
  );
}
