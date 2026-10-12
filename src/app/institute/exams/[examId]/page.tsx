import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ExamReport } from "../../../../components/assessments/exam-report";
import { getServerAccessContext } from "../../../../server/access/actor";
import { examReportQuery, getExamReport } from "../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "گزارش آزمون | پنل مؤسسه", robots: { index: false, follow: false } };
type Props = { params: Promise<{ examId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function InstituteExamReportPage({ params, searchParams }: Props) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "institute")) notFound();
  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  const rawQuery = await searchParams;
  const parsedQuery = examReportQuery.safeParse({
    status: typeof rawQuery.status === "string" ? rawQuery.status : undefined,
    search: typeof rawQuery.search === "string" ? rawQuery.search : undefined,
    cursor: typeof rawQuery.cursor === "string" ? rawQuery.cursor : undefined,
  });
  if (!parsedQuery.success) notFound();
  const report = await getExamReport(actor.userId, "institute", examId, parsedQuery.data);
  if (!report) notFound();
  return <ExamReport report={report} backHref="/institute/exams" />;
}
