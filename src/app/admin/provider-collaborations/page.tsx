import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { ProviderCollaborationReviewQueue } from "../../../components/admin/provider-collaboration-review-queue";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "بررسی همکاری ارائه‌دهندگان | دنا", robots: { index: false, follow: false } };

export default async function AdminProviderCollaborationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();
  const canHandleSupport = actor.memberships.some((item) => item.role === "admin" && item.canHandleTechnicalSupport);
  return <AdminShell active="provider-collaborations" canHandleSupport={canHandleSupport}>
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-10 md:py-12">
      <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">تصمیم نهایی همکاری</p>
        <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">درخواست‌های پذیرفته‌شدهٔ مؤسسه‌ها</h1>
        <p className="mt-2 text-sm leading-8 text-dena-muted">برای جلوگیری از تأیید ذی‌نفع، بازبین دنا نباید نمایندهٔ همین ارائه‌دهنده یا مؤسسه باشد.</p>
      </section>
      <Card className="rounded-[24px] p-6 md:p-8"><ProviderCollaborationReviewQueue /></Card>
    </main>
  </AdminShell>;
}
