import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../components/ui/card";
import { LearningAssessmentAuthor } from "../../../../../components/provider/learning-assessment-author";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getProviderLearningAssessments } from "../../../../../server/assessments/learning-assessment";
import { getProviderCourseDetail } from "../../../../../server/provider/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ارزیابی یادگیری دوره | دنا",
  robots: { index: false, follow: false },
};

export default async function ProviderLearningAssessmentsPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const providerIds = [...new Set(actor.memberships.flatMap((entry) =>
    entry.role === "provider" ? [entry.providerId] : []))];
  const [course, state] = await Promise.all([
    getProviderCourseDetail(providerIds, courseId),
    getProviderLearningAssessments(actor.userId, courseId),
  ]);
  if (!course || !state) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:py-14">
      <Link href={`/provider/courses/${courseId}`} className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به دوره
      </Link>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <div>
          <p className="text-sm font-bold text-dena-brand">طراحی ارزیابی دوره</p>
          <h1 className="mt-2 text-2xl font-extrabold">{course.title}</h1>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            بانک سؤال چهارگزینه‌ای و حدنصاب مختص همین ارزیابی را ثبت کنید. مؤسسهٔ مسئول، مستقل از ارائه‌دهنده، متن و کلیدها را بازبینی می‌کند.
          </p>
        </div>
        <LearningAssessmentAuthor courseId={courseId} lessons={state.readyLessons}
          assessments={state.assessments} canCreate={state.publicationStatus === "draft"} />
        <p className="text-xs leading-7 text-dena-muted">
          کلید پاسخ فقط برای نقش‌های مجاز ارائه‌دهنده و بازبین مستقل نمایش داده می‌شود. تلاش‌ها و هویت دانش‌آموزان در این صفحه در دسترس نیست.
        </p>
      </Card>
    </main>
  );
}
