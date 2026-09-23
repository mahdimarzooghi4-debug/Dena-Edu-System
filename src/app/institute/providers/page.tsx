import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { SupervisionQueue } from "../../../components/institute/supervision-queue";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نظارت بر دوره‌های ارائه‌دهندگان | دنا",
  robots: { index: false, follow: false },
};

export default async function InstituteProvidersPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const ids = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "institute" ? [item.instituteId] : []))];
  if (!ids.length) notFound();
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-5 py-8 md:py-14">
      <Link href="/account" className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به حساب من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">مؤسسه ناظر دنا</p>
        <h1 className="mt-3 text-2xl font-extrabold">درخواست‌های دوره‌های ارائه‌دهندگان</h1>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          فقط دوره‌های مربوط به مؤسسه‌های تحت اختیار شما نمایش داده می‌شوند.
          تأیید یا لغو برای هر دوره جداگانه و همراه با دلیل ثبت می‌شود.
          این تأیید، مجوز رسمی آموزشی از سوی دنا محسوب نمی‌شود.
        </p>
        <SupervisionQueue instituteIds={ids} />
      </Card>
    </main>
  );
}
