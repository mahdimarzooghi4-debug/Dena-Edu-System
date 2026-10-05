import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { IndependentEducatorWorkspace } from "../../../components/account/independent-educator-workspace";
import { getServerAccessContext } from "../../../server/access/actor";
import { getIndependentEducatorWorkspace } from "../../../server/independent-educators/affiliations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "همکاری با مؤسسه‌ها | دنا", robots: { index: false, follow: false },
};

export default async function IndependentEducatorPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "student")) {
    notFound();
  }
  const data = await getIndependentEducatorWorkspace(actor.userId);
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-10 md:py-12">
      <header className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">مسیر همکاری مستقل</p>
        <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">
          همکاری با مؤسسه‌های تأییدشده
        </h1>
        <p className="mt-2 text-sm leading-8 text-dena-muted">
          اگر مجوز مستقل ندارید، می‌توانید با نام خودتان برای همکاری زیر نظر یک یا چند مؤسسه درخواست بدهید.
          تأیید مؤسسه، مجوز رسمی آموزشی یا دسترسی به ساخت دوره ایجاد نمی‌کند.
        </p>
      </header>
      <Card className="rounded-[24px] p-6 md:p-8">
        <IndependentEducatorWorkspace
          institutes={data.institutes}
          initialDisplayName={data.profile?.displayName ?? ""}
          initialAffiliations={data.affiliations.map((item) => ({
            ...item, createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          }))}
        />
      </Card>
    </main>
  );
}
