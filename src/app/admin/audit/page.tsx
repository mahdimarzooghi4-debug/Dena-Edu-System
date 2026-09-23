import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { getServerAccessContext } from "../../server/access/actor";
import { getDb } from "../../db";
import { auditLogs } from "../../db/schema";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گزارش رویدادها | دنا",
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();

  const events = await getDb()
    .select({
      action: auditLogs.action,
      role: auditLogs.actorRole,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-10">
      <h1 className="text-3xl font-extrabold text-dena-deep">رویدادهای سیستم</h1>
      <p className="text-sm text-dena-muted">نمایش محدود تاریخچه عملیات مدیریتی دنا</p>
      <section className="space-y-3">
        {events.map((event, index) => (
          <Card key={`${event.action}-${index}`}>
            <div className="grid gap-2 text-sm">
              <p>عملیات: {event.action}</p>
              <p>نقش: {event.role}</p>
              <p>نوع موجودیت: {event.entityType}</p>
              <p>شناسه: {event.entityId ?? "-"}</p>
              <p>{event.createdAt.toLocaleString("fa-IR")}</p>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
