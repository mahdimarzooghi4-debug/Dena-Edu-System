import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { getDb } from "../../../../db";
import { organizationStudents, user } from "../../../../db/schema";
import { requireOrganizationAccess } from "../../../../server/organization/require-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "پروندهٔ دانش‌آموز | دنا", robots: { index: false, follow: false } };

export default async function OrganizationStudentDetail({ params }: {
  params: Promise<{ studentId: string }>;
}) {
  const { scopes } = await requireOrganizationAccess();
  const { studentId } = await params;
  if (!z.uuid().safeParse(studentId).success) notFound();
  const [student] = await getDb().select({
    firstName: organizationStudents.firstName,
    lastName: organizationStudents.lastName,
    organizationId: organizationStudents.organizationId,
    createdAt: organizationStudents.createdAt,
    phoneVerified: user.phoneNumberVerified,
  }).from(organizationStudents).innerJoin(user, eq(user.id, organizationStudents.userId))
    .where(and(eq(organizationStudents.id, studentId),
      inArray(organizationStudents.organizationId, scopes.map(({ id }) => id)))).limit(1);
  if (!student) notFound();
  const name = `${student.firstName} ${student.lastName}`;
  const organization = scopes.find(({ id }) => id === student.organizationId);
  const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" });
  const back = `/organization/students?organizationId=${student.organizationId}`;

  return <div>
    <header className="border-b border-dena-border bg-white px-5 py-4 md:px-8">
      <nav aria-label="مسیر صفحه" className="text-xs text-dena-muted">
        <Link href={back} className="hover:underline">دانش‌آموزان</Link>
        <span aria-hidden="true"> ‹ </span><span aria-current="page">{name}</span>
      </nav>
      <h1 className="mt-1 text-xl font-extrabold text-dena-deep">نمای کلی وضعیت {name}</h1>
    </header>
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-dena-brand font-extrabold text-white">{student.firstName.slice(0, 1)}</span>
            <div><h2 className="font-extrabold text-dena-deep">{name}</h2>
              <p className="mt-1 text-sm text-dena-muted">{organization?.name}</p></div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.phoneVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {student.phoneVerified ? "شمارهٔ تأییدشده" : "در انتظار تأیید شماره"}
          </span>
        </div>
        <div className="border-b border-dena-border">
          <span className="inline-block border-b-2 border-dena-brand px-3 pb-2 text-sm font-bold text-dena-brand">نمای کلی</span>
        </div>
      </Card>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card><h2 className="font-extrabold">خلاصهٔ پیشرفت یادگیری</h2>
            <p className="mt-3 text-sm leading-7 text-dena-muted">اطلاعات پیشرفت آموزشی در دسترس این سازمان نیست.</p></Card>
          <Card><h2 className="font-extrabold">دوره‌های فعال</h2>
            <p className="mt-3 text-sm leading-7 text-dena-muted">اطلاعات دوره‌های فردی در دسترس این سازمان نیست.</p></Card>
        </div>
        <Card><h2 className="font-extrabold">رویدادهای پرونده</h2>
          <p className="mt-3 rounded-lg bg-dena-bg p-3 text-sm">ثبت پرونده در سازمان · {date.format(student.createdAt)}</p>
        </Card>
      </div>
    </main>
  </div>;
}
