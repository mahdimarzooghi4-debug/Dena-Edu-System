import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { SectionHeading } from "../../components/ui/section-heading";
import { AdminShell } from "../../components/admin/admin-shell";
import { getServerAccessContext } from "../../server/access/actor";
import { getAdminReviewOverview } from "../../server/admin/dashboard";
import { getAdminOverview } from "../../server/admin/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه مدیر | دنا",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();

  const [{ pendingCount, pending, hasMore }, overview] = await Promise.all([
    getAdminReviewOverview(),
    getAdminOverview(),
  ]);
  const roleLabels: Record<string, string> = {
    student: "دانش‌آموز", institute: "مؤسسه", provider: "ارائه‌دهنده",
    admin: "مدیر", organization: "سازمان", benefactor: "خیر و حامی",
  };
  const auditActionLabels: Record<string, string> = {
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
    "organization.student.manual.created": "ثبت دستی پروندهٔ سازمانی",
    "organization.student.bulk.created": "ثبت گروهی پروندهٔ سازمانی",
    "organization.student.api.created": "ثبت پرونده با API سازمان",
    "organization.student.deleted": "حذف پرونده از محدودهٔ سازمان",
    "organization.api_key.created": "ساخت کلید API سازمان",
    "organization.api_key.rotated": "چرخش کلید API سازمان",
    "organization.api_key.revoked": "لغو کلید API سازمان",
  };
  const statusLabels: Record<string, string> = {
    requested: "درخواست‌شده", approved: "تأییدشده", revoked: "لغوشده",
    pending: "در انتظار بررسی", rejected: "ردشده",
  };
  const statusCard = (title: string, statuses: Record<string, number>) => (
    <Card key={title}>
      <h3 className="font-bold">{title}</h3>
      <dl className="mt-3 space-y-2">
        {Object.entries(statuses).map(([status, total]) => (
          <div key={status} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-dena-muted">{statusLabels[status] ?? status}</dt>
            <dd className="font-extrabold">{total.toLocaleString("fa-IR")}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );

  const canHandleSupport = actor.memberships.some((membership) =>
    membership.role === "admin" && membership.canHandleTechnicalSupport,
  );

  return (
    <AdminShell active="home" canHandleSupport={canHandleSupport}>
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه مدیر دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          نمای کلی سیستم
        </h1>
      </section>

      <section className="space-y-4" aria-labelledby="admin-user-counts">
        <SectionHeading id="admin-user-counts">حساب‌ها و دوره‌ها</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3" aria-label="آمار مدیر">
          {Object.entries(overview.users).map(([role, total]) => (
            <Card key={role}>
              <p className="text-sm text-dena-muted">{roleLabels[role] ?? role}</p>
              <p className="mt-2 text-2xl font-extrabold">
                {total.toLocaleString("fa-IR")}
              </p>
            </Card>
          ))}
          <Card>
            <p className="text-sm text-dena-muted">دوره‌ها</p>
            <p className="mt-2 text-2xl font-extrabold">
              {overview.courses.total.toLocaleString("fa-IR")}
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="admin-workflow-states">
        <SectionHeading id="admin-workflow-states">
          وضعیت نظارت و محتوای آموزشی
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          {statusCard("نظارت دوره‌ها", overview.supervision)}
          {statusCard("تمرین‌ها", overview.exercises)}
          {statusCard("ارزیابی‌های یادگیری", overview.learningAssessments)}
        </div>
      </section>

      <section aria-labelledby="admin-recent-audit" className="space-y-4">
        <SectionHeading id="admin-recent-audit" note="حداکثر ۵۰ رویداد اخیر">
          رویدادهای ثبت‌شده
        </SectionHeading>
        {overview.recentAuditEvents.length === 0 ? (
          <Card><p className="text-sm text-dena-muted">هنوز رویدادی ثبت نشده است.</p></Card>
        ) : (
          <ul className="space-y-3">
            {overview.recentAuditEvents.slice(0, 10).map((event) => (
              <li key={event.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {auditActionLabels[event.action] ?? event.action}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-dena-muted">
                      نقش عامل: {roleLabels[event.actorRole] ?? event.actorRole}
                      {event.entityId ? ` · شناسهٔ موضوع: ${event.entityId}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-dena-muted" dateTime={event.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
                    }).format(event.createdAt)}
                  </time>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="admin-pending" className="space-y-4">
        <SectionHeading id="admin-pending">نمای کلی درخواست‌های نقش</SectionHeading>
        <Card>
          <p className="text-sm text-dena-muted">در انتظار بررسی</p>
          <p className="mt-2 text-2xl font-extrabold">
            {pendingCount.toLocaleString("fa-IR")}
          </p>
        </Card>

        {pending.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2">
            {pending.map((application) => {
              const roleLabel = application.role === "institute"
                ? "مؤسسه"
                : application.role === "provider"
                  ? "ارائه‌دهنده"
                  : application.role === "organization"
                    ? "سازمان"
                    : "خیر";
              return (
                <li key={application.id}>
                  <Card className="h-full p-5">
                    <p className="text-xs font-bold text-dena-brand">
                      {roleLabel}
                    </p>
                    <h3 className="mt-2 text-base font-extrabold leading-7">
                      {roleLabel} · {application.proposedName}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-dena-muted">
                      در انتظار بررسی مستقل
                    </p>
                    <Link
                      href={`/admin/role-applications#application-${application.id}`}
                      className="mt-4 inline-flex text-sm font-bold text-dena-brand hover:underline"
                    >
                      بازکردن همین پرونده در صف بررسی
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {pending.length > 0 && (
          <p className="text-sm text-dena-muted">
            نمایش {pending.length} پروندهٔ نخست از صف.
            {hasMore ? " موارد بیشتری وجود دارد." : ""}
          </p>
        )}
      </section>
    </main>
    </AdminShell>
  );
}
