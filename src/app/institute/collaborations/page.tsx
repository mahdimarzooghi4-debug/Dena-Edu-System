import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProviderCollaborationQueue } from "../../../components/institute/provider-collaboration-queue";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "درخواست همکاری ارائه‌دهندگان | دنا", robots: { index: false, follow: false } };

export default async function InstituteCollaborationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "institute")) notFound();
  return <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-10 md:py-12">
    <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
      <p className="text-sm font-bold text-dena-brand">مرحلهٔ اول بررسی همکاری</p>
      <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">درخواست همکاری ارائه‌دهندگان</h1>
      <p className="mt-2 text-sm leading-8 text-dena-muted">درخواست را با ثبت دلیل بپذیر یا رد کن. پذیرش مؤسسه برای فعال‌شدن همکاری نیازمند بررسی نهایی دناست.</p>
    </section>
    <Card className="rounded-[24px] p-6 md:p-8"><ProviderCollaborationQueue /></Card>
  </main>;
}
