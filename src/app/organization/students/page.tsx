import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { OrganizationStudentWorkspace } from "../../../components/organization/student-workspace";
import { getServerAccessContext } from "../../../server/access/actor";
import { listOrganizationStudents } from "../../../server/organization/students";
import { getOrganizationScopes } from "../../../server/organization/scopes";
import { Card } from "../../../components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دانش‌آموزان سازمان | دنا", robots: { index: false, follow: false },
};

export default async function OrganizationStudentsPage({
  searchParams,
}: { searchParams: Promise<{ activation?: string; organizationId?: string; cursor?: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "organization")) notFound();
  const scopes = await getOrganizationScopes(actor.userId);
  if (!scopes.length) notFound();
  const { activation, organizationId, cursor } = await searchParams;
  const activationPendingOnly = activation === "pending";
  const selectedOrganization = scopes.find((scope) => scope.id === organizationId);
  const visibleScopes = selectedOrganization ? [selectedOrganization] : scopes;
  let studentPage;
  try {
    studentPage = await listOrganizationStudents(visibleScopes.map((scope) => scope.id), {
      activationPendingOnly, cursor, limit: 50,
    });
  } catch {
    redirect("/organization/students");
  }
  const nextParams = new URLSearchParams();
  if (activationPendingOnly) nextParams.set("activation", "pending");
  if (selectedOrganization) nextParams.set("organizationId", selectedOrganization.id);
  if (studentPage.nextCursor) nextParams.set("cursor", studentPage.nextCursor);
  const nextHref = `/organization/students?${nextParams.toString()}`;

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-7 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/organization" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به خانهٔ سازمان</Link>
        <Link href="/account" className={buttonClassName("secondary")}>حساب من</Link>
      </header>
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">دسترسی در محدودهٔ سازمان</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">دانش‌آموزان</h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          ثبت دستی، ورود گروهی با CSV و Excel، و ساخت پرونده از API سازمان. حساب ورود دانش‌آموز با تأیید شمارهٔ موبایل توسط خودش فعال می‌شود.
        </p>
      </section>
      {activationPendingOnly && <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50">
        <p className="text-sm font-bold text-amber-950">
          فهرست فقط پرونده‌های در انتظار تأیید شماره را نشان می‌دهد
          {selectedOrganization ? `؛ سازمان: ${selectedOrganization.name}` : ""}.
        </p>
        <Link href={selectedOrganization
          ? `/organization/students?organizationId=${encodeURIComponent(selectedOrganization.id)}`
          : "/organization/students"}
          className={buttonClassName("secondary")}>نمایش همهٔ پرونده‌ها</Link>
      </Card>}
      <OrganizationStudentWorkspace scopes={visibleScopes} initialStudents={studentPage.students}
        initialOrganizationId={selectedOrganization?.id} />
      {studentPage.nextCursor && <nav aria-label="صفحه‌بندی دانش‌آموزان" className="flex justify-end">
        <Link href={nextHref} className={buttonClassName("secondary")}>نمایش صفحهٔ بعد</Link>
      </nav>}
    </main>
  );
}
