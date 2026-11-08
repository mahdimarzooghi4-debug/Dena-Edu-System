import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizationStudentWorkspace } from "../../../../../components/organization/student-workspace";
import { requireOrganizationAccess } from "../../../../../server/organization/require-access";

export const dynamic = "force-dynamic";

export default async function RegistrationPage({ params, searchParams }: {
  params: Promise<{ method: string }>; searchParams: Promise<{ organizationId?: string }>;
}) {
  const { scopes } = await requireOrganizationAccess();
  const { method } = await params;
  if (method !== "manual" && method !== "bulk" && method !== "api") notFound();
  const { organizationId } = await searchParams;
  const selected = organizationId ? scopes.find(({ id }) => id === organizationId) : scopes[0];
  if (!selected) notFound();
  return <main id="main-content" className="space-y-5 p-5 md:p-8">
    <Link href={`/organization/students?organizationId=${selected.id}`} className="text-sm font-bold text-dena-brand">بازگشت به دانش‌آموزان</Link>
    <h1 className="text-2xl font-extrabold">{({ manual: "ثبت دستی دانش‌آموز", bulk: "ورود گروهی دانش‌آموزان", api: "اتصال API سازمان" })[method]}</h1>
    <OrganizationStudentWorkspace key={`${method}:${selected.id}`} scopes={scopes} initialStudents={[]}
      initialOrganizationId={selected.id} registrationMode={method} searchTerm="" activationPendingOnly={false} />
  </main>;
}
