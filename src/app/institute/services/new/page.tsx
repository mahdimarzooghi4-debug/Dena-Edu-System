import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InstituteServiceForm } from "../../../../components/institute/service-form";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteScopes } from "../../../../server/institute/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تعریف خدمت | پنل مؤسسه", robots: { index: false, follow: false } };

export default async function NewInstituteServicePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();
  const institutes = await getInstituteScopes(actor.userId);
  if (!institutes.length) notFound();
  return <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
    <header><p className="text-sm font-bold text-dena-brand">کاتالوگ مؤسسه</p><h1 className="mt-1 text-2xl font-extrabold text-dena-deep">تعریف خدمت جدید</h1>
      <p className="mt-2 text-sm leading-7 text-dena-muted">اطلاعاتی را وارد کنید که پیش از خرید باید برای دانش‌آموز روشن باشد.</p></header>
    <InstituteServiceForm institutes={institutes} />
  </main>;
}
