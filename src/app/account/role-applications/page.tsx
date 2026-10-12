import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { RoleApplicationForm } from "../../../components/account/role-application-form";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "درخواست دسترسی | دنا", robots: { index: false, follow: false },
};

export default async function RoleApplicationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  if (!await getServerAccessContext()) redirect("/login");
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-8 md:py-14">
      <Link href="/account" className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به حساب من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">عضویت و نقش‌های سازمانی</p>
        <h1 className="mt-3 text-2xl font-extrabold">درخواست دسترسی جدید</h1>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          این درخواست صرفاً برای بررسی است. مدارک باید از مسیر محرمانه و مستقل
          بررسی شوند؛ تأیید ادمین نیز مجوز رسمی فعالیت آموزشی صادر نمی‌کند.
          نقش ادمین از این مسیر قابل درخواست یا دریافت نیست.
        </p>
        <RoleApplicationForm />
      </Card>
    </main>
  );
}
