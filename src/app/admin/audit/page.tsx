import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { AdminShell } from "../../../components/admin/admin-shell";
import { buttonClassName } from "../../../components/ui/button";
import { getServerAccessContext } from "../../../server/access/actor";
import { getRecentAuditLogs } from "../../../server/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گزارش رویدادها | دنا",
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();
  const { cursor } = await searchParams;
  const result = await getRecentAuditLogs(cursor);
  if (result.invalidCursor) notFound();
  const { events } = result;
  const roleLabels: Record<string, string> = {
    student: "دانش‌آموز", institute: "مؤسسه", provider: "ارائه‌دهنده",
    admin: "مدیر", organization: "سازمان", benefactor: "خیر و حامی",
  };
  const entityLabels: Record<string, string> = {
    SYSTEM: "سامانه", USER: "حساب", COURSE: "دوره",
    PRACTICE: "ارزیابی آموزشی", MEDIA: "رسانه",
    ROLE_APPLICATION: "درخواست نقش",
  };
  const actionLabels: Record<string, string> = {
    "role_application.approved": "تأیید درخواست نقش",
    "role_application.rejected": "رد درخواست نقش",
    "course.supervision.requested": "درخواست نظارت دوره",
    "course.supervision.approved": "تأیید نظارت دوره",
    "course.supervision.rejected": "رد درخواست نظارت دوره",
    "course.supervision.revoked": "لغو نظارت دوره",
    "course.practice.approved": "تأیید تمرین دوره",
    "course.practice.rejected": "رد تمرین دوره",
    "course.learning_assessment.approved": "تأیید ارزیابی یادگیری",
    "course.learning_assessment.rejected": "رد ارزیابی یادگیری",
    "institute.assessment.question.created": "افزودن سؤال به بانک مؤسسه",
    "institute.assessment.question.updated": "ویرایش سؤال بانک مؤسسه",
    "admin.dena_question.created": "افزودن سؤال به بانک دنا",
    "admin.dena_question.updated": "ویرایش سؤال بانک دنا",
    "institute.exam.created": "ساخت آزمون مؤسسه",
    "admin.dena_exam.created": "ساخت آزمون هماهنگ دنا",
    "institute.exam.published": "انتشار آزمون مؤسسه",
    "institute.exam.cancelled": "لغو آزمون مؤسسه",
    "admin.dena_exam.published": "انتشار آزمون هماهنگ دنا",
    "admin.dena_exam.cancelled": "لغو آزمون هماهنگ دنا",
  };

  const canHandleSupport = actor.memberships.some((membership) =>
    membership.role === "admin" && membership.canHandleTechnicalSupport,
  );

  return (
    <AdminShell active="audit" canHandleSupport={canHandleSupport}>
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-dena-deep">رویدادهای سیستم</h1>
      </header>
      <p className="text-sm leading-7 text-dena-muted">
        این فهرست در هر صفحه حداکثر ۵۰ رویداد را نشان می‌دهد. متن پاسخ دانش‌آموز، OTP،
        token، کلید رسانه و دلیل خصوصی بازبینی در این گزارش ذخیره یا نمایش داده نمی‌شود.
      </p>
      {events.length === 0 ? (
        <Card><p className="text-sm text-dena-muted">هنوز رویدادی ثبت نشده است.</p></Card>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">
                      {actionLabels[event.action] ?? event.action}
                    </h2>
                    <p className="text-sm text-dena-muted">
                      {entityLabels[event.entityType] ?? event.entityType}
                      {event.entityId ? ` · ${event.entityId}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-dena-muted" dateTime={event.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
                    }).format(event.createdAt)}
                  </time>
                </div>
                <p className="break-all text-xs text-dena-muted">
                  عامل: {roleLabels[event.actorRole] ?? event.actorRole} · {event.actorId}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      )}
      <nav className="flex flex-wrap justify-between gap-3" aria-label="صفحه‌بندی رویدادها">
        {cursor && (
          <Link href="/admin/audit" className={buttonClassName("secondary")}>
            تازه‌ترین رویدادها
          </Link>
        )}
        {result.nextCursor && (
          <Link href={`/admin/audit?cursor=${encodeURIComponent(result.nextCursor)}`}
            className={buttonClassName("secondary")}>
            رویدادهای قدیمی‌تر
          </Link>
        )}
      </nav>
    </main>
    </AdminShell>
  );
}
