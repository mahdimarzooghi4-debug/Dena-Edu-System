import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentExamAttempt } from "../../../../../../components/student/student-exam-attempt";
import { StudentShell } from "../../../../../../components/student/student-shell";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { ExamManagementError, getStudentExamAttempt } from "../../../../../../server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آزمون | دنا", robots: { index: false, follow: false } };
type Props = { params: Promise<{ examId: string; attemptId: string }> };

export default async function StudentExamAttemptPage({ params }: Props) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "student")) notFound();
  const { examId, attemptId } = await params;
  let attempt;
  try {
    attempt = await getStudentExamAttempt(actor.userId, examId, attemptId);
  } catch (error) {
    if (error instanceof ExamManagementError) notFound();
    throw error;
  }
  return <StudentShell active="assessments" title="آزمون">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-2">
        <Link href="/student/assessments" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به آزمون‌ها</Link>
        <p className="text-xs font-bold text-dena-brand">آزمون زمان‌دار</p>
        <h1 className="text-2xl font-extrabold text-dena-deep">{attempt.title}</h1>
        <p className="text-sm leading-7 text-dena-muted">{attempt.instructions}</p>
      </header>
      <StudentExamAttempt examId={examId} attempt={attempt} />
    </div>
  </StudentShell>;
}
