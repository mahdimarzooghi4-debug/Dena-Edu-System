import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../components/ui/card";
import { LearningAssessmentReview } from "../../../../../components/institute/learning-assessment-review";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getInstituteLearningAssessments } from "../../../../../server/assessments/learning-assessment";
import { getInstituteCourseDetail } from "../../../../../server/institute/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "بازبینی ارزیابی یادگیری | دنا",
  robots: { index: false, follow: false },
};

export default async function InstituteLearningAssessmentsPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const instituteIds = [...new Set(actor.memberships.flatMap((entry) =>
    entry.role === "institute" ? [entry.instituteId] : []))];
  const [course, state] = await Promise.all([
    getInstituteCourseDetail(instituteIds, courseId),
    getInstituteLearningAssessments(actor.userId, courseId),
  ]);
  if (!course || !state) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:py-14">
      <Link href={`/institute/courses/${courseId}`} className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به دوره
      </Link>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <div>
          <p className="text-sm font-bold text-dena-brand">بازبینی مستقل ارزیابی یادگیری</p>
          <h1 className="mt-2 text-2xl font-extrabold">{course.title}</h1>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            بررسی کنید که پرسش‌ها، کلیدهای اعلام‌شده و حدنصاب همین ارزیابی با محتوای دوره سازگار باشند. تصمیم شما نهایی است و فقط برای همین ارزیابی ثبت می‌شود.
          </p>
        </div>
        <LearningAssessmentReview courseId={courseId} assessments={state.assessments}
          canReview={course.publicationStatus === "draft" && course.supervisionStatus === "approved"} />
        <p className="text-xs leading-7 text-dena-muted">
          حساب ارائه‌دهندهٔ همین دوره نمی‌تواند تصمیم مؤسسه را ثبت کند. هیچ تلاش یا دادهٔ دانش‌آموزی در این صفحه خوانده نمی‌شود.
        </p>
      </Card>
    </main>
  );
}
