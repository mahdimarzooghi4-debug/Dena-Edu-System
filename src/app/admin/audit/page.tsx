import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { AdminShell } from "../../../components/admin/admin-shell";
import { buttonClassName } from "../../../components/ui/button";
import { getServerAccessContext } from "../../../server/access/actor";
import { auditActions, getRecentAuditLogs } from "../../../server/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گزارش رویدادها | دنا",
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage({
  searchParams,
}: { searchParams: Promise<{ cursor?: string; action?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();
  const { cursor, action: requestedAction } = await searchParams;
  const action = auditActions.find((value) => value === requestedAction);
  const result = await getRecentAuditLogs(cursor, action);
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
    "institute.service.created": "ایجاد خدمت مؤسسه",
    "institute.service.updated": "ویرایش خدمت مؤسسه",
    "student.service_order.created": "ثبت سفارش خدمت",
    "student.service_order.cancelled": "لغو سفارش خدمت",
    "student.profile.phone_changed": "تغییر شمارهٔ تماس",
    "institute.service_order.guardian_consent_confirmed": "ثبت رضایت سرپرست",
    "institute.service_call.scheduled": "زمان‌بندی جلسه",
    "institute.service_call.started": "شروع جلسه",
    "institute.service_call.ended": "پایان جلسه توسط مؤسسه",
    "student.service_call.ended": "پایان جلسه توسط دانش‌آموز",
    "institute.service_call.follow_up.published": "انتشار پیگیری جلسه",
    "institute.service_call.cancelled": "لغو جلسه",
    "provider.collaboration.requested": "درخواست همکاری ارائه‌دهنده",
    "provider.collaboration.withdrawn": "انصراف از همکاری",
    "institute.provider_collaboration.accepted": "پذیرش همکاری توسط مؤسسه",
    "institute.provider_collaboration.rejected": "رد همکاری توسط مؤسسه",
    "admin.provider_collaboration.approved": "تأیید نهایی همکاری دنا",
    "admin.provider_collaboration.rejected": "رد نهایی همکاری دنا",
    "educator.affiliation.requested": "درخواست وابستگی مدرس",
    "educator.affiliation.withdrawn": "انصراف مدرس",
    "institute.educator_affiliation.approved": "تأیید وابستگی مدرس",
    "institute.educator_affiliation.rejected": "رد وابستگی مدرس",
    "institute.educator_affiliation.revoked": "لغو وابستگی مدرس",
    "institute.course_ownership.transferred": "انتقال مالکیت دوره",

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
      <form action="/admin/audit" method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-dena-border bg-white p-4">
        <label className="min-w-0 flex-1 text-sm font-bold text-dena-deep">
          نوع رویداد
          <select name="action" defaultValue={action ?? ""} className="mt-2 min-h-11 w-full rounded-lg border border-dena-border bg-dena-bg px-3 text-sm font-normal">
            <option value="">همهٔ رویدادها</option>
            {auditActions.map((value) => <option key={value} value={value}>{actionLabels[value] ?? value}</option>)}
          </select>
        </label>
        <button type="submit" className={buttonClassName("primary")}>اعمال فیلتر</button>
        {action && <Link href="/admin/audit" className={buttonClassName("secondary")}>حذف فیلتر</Link>}
      </form>
      {events.length === 0 ? (
        <Card><p className="text-sm text-dena-muted">{action ? "رویدادی با این فیلتر پیدا نشد." : cursor ? "رویداد قدیمی‌تری وجود ندارد." : "هنوز رویدادی ثبت نشده است."}</p></Card>
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
          <Link href={action ? `/admin/audit?action=${encodeURIComponent(action)}` : "/admin/audit"} className={buttonClassName("secondary")}>
            تازه‌ترین رویدادها
          </Link>
        )}
        {result.nextCursor && (
          <Link href={`/admin/audit?cursor=${encodeURIComponent(result.nextCursor)}${action ? `&action=${encodeURIComponent(action)}` : ""}`}
            className={buttonClassName("secondary")}>
            رویدادهای قدیمی‌تر
          </Link>
        )}
      </nav>
    </main>
    </AdminShell>
  );
}
