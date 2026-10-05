import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AdminShell } from "../../../../components/admin/admin-shell";
import { ExamReport } from "../../../../components/assessments/exam-report";
import { getServerAccessContext } from "../../../../server/access/actor";
import { examReportQuery, getExamReport } from "../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "گزارش آزمون هماهنگ | مدیریت", robots: { index: false, follow: false } };
type Props = { params: Promise<{ examId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminExamReportPage({ params, searchParams }: Props) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();
  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  const rawQuery = await searchParams;
  const parsedQuery = examReportQuery.safeParse({
    status: typeof rawQuery.status === "string" ? rawQuery.status : undefined,
    search: typeof rawQuery.search === "string" ? rawQuery.search : undefined,
    cursor: typeof rawQuery.cursor === "string" ? rawQuery.cursor : undefined,
  });
  if (!parsedQuery.success) notFound();
  const report = await getExamReport(actor.userId, "admin", examId, parsedQuery.data);
  if (!report) notFound();
  return <AdminShell active="exams" canHandleSupport={actor.memberships.some((member) => member.role === "admin" && member.canHandleTechnicalSupport)}>
    <ExamReport report={report} backHref="/admin/exams" />
  </AdminShell>;
}
