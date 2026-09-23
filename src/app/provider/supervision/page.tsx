import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { CourseSupervisionRequest } from "../../../components/provider/course-supervision-request";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "درخواست نظارت دوره | دنا", robots: { index: false, follow: false },
};

export default async function ProviderSupervisionPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const ids = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "provider" ? [item.providerId] : []))];
  if (!ids.length) notFound();
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-8 md:py-14">
      <Link href="/account" className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به حساب من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">ارائه‌دهندهٔ تأییدشده دنا</p>
        <h1 className="mt-3 text-2xl font-extrabold">درخواست نظارت برای هر دوره</h1>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          پذیرش نقش ارائه‌دهنده به‌تنهایی مجوز مدیریت یا انتشار دوره نیست.
          مؤسسه مسئول باید درخواست مربوط به <strong>همین دوره</strong> را مستقل تأیید کند.
        </p>
        <CourseSupervisionRequest providerIds={ids} />
      </Card>
    </main>
  );
}
