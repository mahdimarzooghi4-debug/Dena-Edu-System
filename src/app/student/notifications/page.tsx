import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();

  return (
    <StudentShell active="notifications" title="اعلان‌ها">
      <div className="mx-auto max-w-2xl">
        <SupportNotifications />
      </div>
    </StudentShell>
  );
}
