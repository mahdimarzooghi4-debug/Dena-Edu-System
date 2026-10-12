import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProviderCollaborationWorkspace } from "../../../components/provider/provider-collaboration-workspace";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import { getProviderCollaborations } from "../../../server/provider/collaborations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "همکاری با مؤسسه‌ها | دنا", robots: { index: false, follow: false } };

export default async function ProviderCollaborationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const providerIds = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "provider" ? [item.providerId] : []))];
  if (!providerIds.length) notFound();
  const data = await getProviderCollaborations(actor.userId);
  return <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-10 md:py-12">
    <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
      <p className="text-sm font-bold text-dena-brand">فعالیت با هویت حرفه‌ای خودت</p>
      <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">همکاری با مؤسسه‌ها</h1>
      <p className="mt-2 text-sm leading-8 text-dena-muted">
        پس از تأیید مؤسسه و بررسی دنا، نشان نارنجی همکاری برای ارائه‌دهنده ثبت می‌شود. این تأیید جایگزین مجوز جداگانهٔ هر دوره نیست.
      </p>
    </section>
    <Card className="rounded-[24px] p-6 md:p-8">
      <ProviderCollaborationWorkspace providerIds={providerIds} institutes={data.institutes}
        initialCollaborations={data.collaborations.map((item) => ({
          ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(),
        }))} />
    </Card>
  </main>;
}
