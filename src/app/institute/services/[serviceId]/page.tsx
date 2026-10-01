import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { InstituteServiceForm } from "../../../../components/institute/service-form";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteServiceById } from "../../../../server/institute/services";
import { getInstituteScopes } from "../../../../server/institute/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش خدمت | پنل مؤسسه", robots: { index: false, follow: false } };
type Props = { params: Promise<{ serviceId: string }> };

export default async function EditInstituteServicePage({ params }: Props) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) notFound();
  const { serviceId } = await params;
  if (!z.uuid().safeParse(serviceId).success) notFound();
  const [service, institutes] = await Promise.all([
    getInstituteServiceById(actor.userId, serviceId), getInstituteScopes(actor.userId),
  ]);
  if (!service || !institutes.length) notFound();
  return <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
    <header><p className="text-sm font-bold text-dena-brand">{service.instituteName}</p><h1 className="mt-1 text-2xl font-extrabold text-dena-deep">ویرایش خدمت</h1></header>
    <InstituteServiceForm institutes={institutes} service={service} />
  </main>;
}
