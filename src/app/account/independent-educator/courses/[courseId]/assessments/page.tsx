import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../../components/ui/card";
import { LearningAssessmentAuthor } from "../../../../../../components/provider/learning-assessment-author";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { getCourseLearningAssessmentsForOwner } from "../../../../../../server/assessments/learning-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ارزیابی یادگیری دوره | دنا", robots: { index: false, follow: false },
};

export default async function IndependentEducatorAssessmentsPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const state = await getCourseLearningAssessmentsForOwner(actor.userId, courseId);
  if (!state) notFound();
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-10 md:py-12">
      <Link href="/account/independent-educator" className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به همکاری و دوره‌ها
      </Link>
      <Card className="space-y-5 rounded-[24px] p-6 md:p-8">
        <div>
          <p className="text-sm font-bold text-dena-brand">محتوای آموزشی دوره</p>
          <h1 className="mt-2 text-2xl font-extrabold text-dena-deep">
            ساخت و بازبینی ارزیابی یادگیری
          </h1>
          <p className="mt-2 text-sm leading-8 text-dena-muted">
            فقط همکار مستقلِ دارای همکاری فعال با مؤسسهٔ ناظر می‌تواند برای
            پیش‌نویس دوره ارزیابی بسازد. تا تأیید مستقل مؤسسه، ارزیابی برای
            دانش‌آموز قابل مشاهده نیست.
          </p>
        </div>
        <LearningAssessmentAuthor
          courseId={courseId}
          lessons={state.readyLessons}
          assessments={state.assessments}
          canCreate={state.publicationStatus === "draft"}
          apiPath={`/api/independent-educator/courses/${courseId}/assessments`}
        />
      </Card>
    </main>
  );
}
