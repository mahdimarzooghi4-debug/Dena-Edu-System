import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { OrganizationStudentWorkspace } from "../../../components/organization/student-workspace";
import { getServerAccessContext } from "../../../server/access/actor";
import { listOrganizationStudents } from "../../../server/organization/students";
import { getOrganizationScopes } from "../../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دانش‌آموزان سازمان | دنا", robots: { index: false, follow: false },
};

export default async function OrganizationStudentsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "organization")) notFound();
  const scopes = await getOrganizationScopes(actor.userId);
  if (!scopes.length) notFound();
  const students = await listOrganizationStudents(scopes.map((scope) => scope.id));

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
      <OrganizationStudentWorkspace scopes={scopes} initialStudents={students} />
    </main>
  );
}
