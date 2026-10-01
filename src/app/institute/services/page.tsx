import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteServices } from "../../../server/institute/services";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خدمات مؤسسه | دنا", robots: { index: false, follow: false } };

const categoryLabel: Record<string, string> = {
  consultation: "مشاوره", career_guidance: "انتخاب رشته و مسیر شغلی",
  assessment: "ارزیابی آموزشی", support: "پشتیبانی آموزشی", other: "سایر خدمات",
};
const statusLabel = { draft: "پیش‌نویس", active: "فعال", paused: "متوقف" };

export default async function InstituteServicesPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();
  const result = await getInstituteServices(actor.userId);
  if (!result.institutes.length) notFound();

  return <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm font-bold text-dena-brand">خدمات جانبی و تخصصی</p>
        <h1 className="mt-1 text-2xl font-extrabold text-dena-deep">کاتالوگ خدمات مؤسسه</h1>
        <p className="mt-2 text-sm leading-7 text-dena-muted">مشاوره، انتخاب رشته، ارزیابی و پشتیبانی را جدا از ثبت‌نام دوره تعریف کنید.</p></div>
      <Link href="/institute/services/new" className={buttonClassName("primary")}>تعریف خدمت</Link>
    </header>
    <Card className="border-amber-300 bg-amber-50 text-sm leading-7 text-amber-950">
      سهم دنا ۱۰٪ از مبلغ ناخالص خدمت است؛ کارمزد درگاه از سهم مؤسسه کسر می‌شود. در این مرحله خدمت‌ها ثبت و آماده‌سازی می‌شوند؛ خرید آنلاین، فاکتور و تسویه تا تکمیل اتصال درگاه فعال نیست.
    </Card>
    {result.services.length === 0 ? <Card className="space-y-3">
      <h2 className="font-extrabold text-dena-deep">هنوز خدمتی تعریف نشده است</h2>
      <p className="text-sm leading-7 text-dena-muted">برای هر خدمت، قیمت، سهمیهٔ زمانی، رضایت لازم و شرایط لغو را پیش از ارائه مشخص کنید.</p>
      <Link href="/institute/services/new" className="inline-flex font-bold text-dena-brand hover:underline">تعریف نخستین خدمت</Link>
    </Card> : <div className="grid gap-4 md:grid-cols-2">
      {result.services.map((service) => <Card key={service.id} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold text-dena-brand">{service.instituteName} · {categoryLabel[service.category] ?? "خدمت"}</p>
            <h2 className="mt-2 text-lg font-extrabold text-dena-deep">{service.title}</h2></div>
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">{statusLabel[service.status]}</span>
        </div>
        <p className="text-sm leading-7 text-dena-muted">{service.description}</p>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-dena-bg p-4 text-sm">
          <div><dt className="text-dena-muted">قیمت</dt><dd className="mt-1 font-extrabold text-dena-deep">{service.priceToman.toLocaleString("fa-IR")} تومان</dd></div>
          <div><dt className="text-dena-muted">سهمیه</dt><dd className="mt-1 font-bold text-dena-deep">{service.includedMinutes === null ? "بدون سهمیهٔ زمانی" : `${service.includedMinutes.toLocaleString("fa-IR")} دقیقه · ${service.validityDays?.toLocaleString("fa-IR")} روز اعتبار`}</dd></div>
          <div className="col-span-2"><dt className="text-dena-muted">رضایت سرپرست</dt><dd className="mt-1 font-bold text-dena-deep">{service.guardianConsentRequired ? "لازم است" : "الزام نشده است"}</dd></div>
        </dl>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-dena-border pt-4">
          <span className="text-xs text-dena-muted">ویرایش: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(service.updatedAt)}</span>
          <Link href={`/institute/services/${encodeURIComponent(service.id)}`} className="rounded-lg border border-dena-brand px-4 py-2 text-sm font-bold text-dena-brand">ویرایش خدمت</Link>
        </div>
      </Card>)}
    </div>}
  </main>;
}
