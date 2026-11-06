import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "تنظیمات مدیریت | دنا", robots: { index: false, follow: false } };
export default async function AdminSettingsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "admin")) notFound();
  const support = actor.memberships.some((member) => member.role === "admin" && member.canHandleTechnicalSupport);
  const settings = [
    ["نقش نشست", "مدیر دنا"],
    ["دسترسی به صندوق پشتیبانی", support ? "مجاز" : "تخصیص داده نشده"],
    ["منطقهٔ زمانی گزارش‌ها", "تهران"],
    ["نمایش اعداد", "فارسی"],
    ["بانک سؤال", "بانک مستقل دنا"],
    ["انتشار آزمون", "پیش‌نویس و سپس انتشار توسط مدیر"],
  ];
  return <AdminShell active="settings" canHandleSupport={support}>
    <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-6 px-5 py-6 md:px-7">
      <header className="space-y-3"><p className="text-xs text-dena-muted">مدیریت / تنظیمات</p><h1 className="text-[27px] font-extrabold text-dena-deep">تنظیمات مدیریت</h1><p className="text-sm leading-7 text-dena-muted">وضعیت دسترسی نشست و تنظیمات فعلی نمایش سامانه.</p></header>
      <Card><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{settings.map(([label,value]) => <div key={label}><dt className="text-xs text-dena-muted">{label}</dt><dd className="mt-2 text-sm font-bold text-dena-deep">{value}</dd></div>)}</dl></Card>
      <div className="grid gap-4 sm:grid-cols-2"><Card><h2 className="font-extrabold">حساب مدیر</h2><p className="my-3 text-sm leading-7 text-dena-muted">مشاهده و مدیریت مشخصات حساب از صفحهٔ حساب من انجام می‌شود.</p><Link href="/account" className="text-sm font-bold text-dena-brand">رفتن به حساب من</Link></Card>
      <Card><h2 className="font-extrabold">پیگیری عملیات</h2><p className="my-3 text-sm leading-7 text-dena-muted">گزارش تغییرات ثبت‌شده و تصمیم‌های مدیریتی را مشاهده کنید.</p><Link href="/admin/audit" className="text-sm font-bold text-dena-brand">مشاهدهٔ رویدادهای سیستم</Link></Card></div>
    </main>
  </AdminShell>;
}
