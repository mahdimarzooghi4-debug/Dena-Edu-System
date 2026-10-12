import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { IndependentEducatorQueue } from "../../../components/institute/independent-educator-queue";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "همکاران مستقل | پنل مؤسسه", robots: { index: false, follow: false },
};

export default async function InstituteEducatorsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "institute")) {
    notFound();
  }
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
      <header className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">درخواست‌های همکاری</p>
        <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">همکاران مستقل مؤسسه</h1>
        <p className="mt-2 text-sm leading-8 text-dena-muted">
          درخواست‌ها فقط برای مؤسسه‌های تحت دسترسی شما نمایش داده می‌شوند. پذیرش، رابطهٔ همکاری را ثبت می‌کند؛
          مجوز مستقل یا دسترسی دوره ایجاد نمی‌کند.
        </p>
      </header>
      <Card className="rounded-[24px] p-6 md:p-8"><IndependentEducatorQueue /></Card>
    </main>
  );
}
