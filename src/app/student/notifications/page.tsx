import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { StudentShell } from "../../../components/student/student-shell";
import { SupportNotifications } from "../../../components/support/support-notifications";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "اعلان‌ها | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentNotificationsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) {
    notFound();
  }

  return (
    <StudentShell active="notifications" title="اعلان‌ها">
      <div className="space-y-5">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">پیگیری حساب دانش‌آموز</p>
          <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">
            اعلان‌ها
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            در این نسخه، اعلان‌های مربوط به درخواست‌های پشتیبانی نمایش داده می‌شوند.
          </p>
        </section>
        <Card>
          <SupportNotifications />
        </Card>
      </div>
    </StudentShell>
  );
}
