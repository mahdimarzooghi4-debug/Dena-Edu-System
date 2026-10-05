import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { LearningAssessmentCard } from "@/components/student/learning-assessment-card";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentProgressOverview } from "@/server/student/progress-overview";
import { getStudentDashboardCourses } from "@/server/student/dashboard";
import { getStudentLearningAssessments } from "@/server/assessments/learning-assessment";
import { getStudentExamCatalog } from "@/server/assessments/exam-management";
import { StudentExamCard } from "@/components/student/student-exam-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تمرین‌ها و آزمون‌ها | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentAssessmentsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const [overview, courseResult, examResult] = await Promise.all([
    getStudentProgressOverview(actor.userId),
    getStudentDashboardCourses(actor.userId),
    getStudentExamCatalog(actor.userId),
  ]);
  const learning = await Promise.all(courseResult.courses.map(async (course) => ({
    course,
    data: await getStudentLearningAssessments(actor.userId, course.courseId),
  })));
  const assessmentGroups = learning.flatMap(({ course, data }) =>
    (data?.assessments ?? []).map((assessment) => ({ course, assessment: {
      ...assessment,
      attempts: assessment.attempts.map((attempt) => ({
        ...attempt,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      })),
    } })),
  );
  const practices = overview.courses.filter((course) => course.practice.state !== "not_available");

  return (
    <StudentShell active="assessments" title="تمرین‌ها و آزمون‌ها">
      <div className="space-y-6">
        {(examResult?.exams.length ?? 0) > 0 && (
          <section className="space-y-4" aria-labelledby="scheduled-exams-title">
            <div>
              <p className="text-sm font-bold text-dena-brand">دو مدل آزمون مستقل از ارزیابی یادگیری</p>
              <h2 id="scheduled-exams-title" className="mt-1 text-xl font-extrabold text-dena-deep">
                آزمون‌های برنامه‌ریزی‌شده و هماهنگ دنا
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {examResult!.exams.map((exam) => <StudentExamCard key={exam.id} exam={exam} />)}
            </div>
          </section>
        )}
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">ارزیابی‌های من</p>
          <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">
            تمرین‌ها و ارزیابی‌های قابل دسترس
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            ارزیابی‌های تأییدشدهٔ هر دوره و تمرین‌های فعال همین‌جا نمایش داده می‌شوند.
            آزمون سراسری یک فرایند جداگانه است و در این بخش شبیه‌سازی نمی‌شود.
          </p>
        </section>

        {assessmentGroups.length > 0 && (
          <section className="space-y-4" aria-labelledby="learning-assessments-title">
            <h2 id="learning-assessments-title" className="text-xl font-extrabold text-dena-deep">ارزیابی یادگیری دوره</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {assessmentGroups.map(({ course, assessment }) => (
                <div key={assessment.id} className="space-y-2">
                  <p className="px-1 text-xs font-bold text-dena-muted">دوره: {course.title}</p>
                  <LearningAssessmentCard courseId={course.courseId} assessment={assessment} />
                </div>
              ))}
            </div>
          </section>
        )}

        {practices.length > 0 && (
          <section className="space-y-4" aria-labelledby="course-practices-title">
            <h2 id="course-practices-title" className="text-xl font-extrabold text-dena-deep">تمرین‌های دوره</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {practices.map((course) => (
                <li key={course.courseId}>
                  <Card className="h-full rounded-[22px] p-6">
                    <p className="text-xs font-bold text-dena-brand">تمرین دوره</p>
                    <h3 className="mt-2 text-lg font-extrabold">{course.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-dena-muted">
                      {course.practice.state === "not_attempted"
                        ? "تمرین تأییدشده در انتظار پاسخ شماست."
                        : course.practice.correct
                          ? "پاسخ ثبت‌شدهٔ شما در این تمرین درست بوده است."
                          : "پاسخ شما ثبت شده است."}
                    </p>
                    <a href={`/student/courses/${course.courseId}/watch`} className="mt-5 inline-flex rounded-xl border border-dena-line px-4 py-2 text-sm font-bold text-dena-deep hover:bg-dena-bg">
                      {course.practice.state === "not_attempted" ? "رفتن به تمرین" : "مشاهده دوره"}
                    </a>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {assessmentGroups.length === 0 && practices.length === 0 && (
          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">فعلاً ارزیابی قابل دسترسی ندارید</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              ارزیابی‌های تأییدشدهٔ دوره‌های ثبت‌نام‌شدهٔ شما در همین صفحه ظاهر می‌شوند.
            </p>
          </Card>
        )}

        <Card className="rounded-[22px] border-dashed p-5">
          <p className="text-xs leading-7 text-dena-muted">
            کلید پاسخ و درستی هر سؤال نمایش داده نمی‌شود. در ارزیابی یادگیری، نتیجهٔ «نیاز به مرور»
            شما را به درس‌های مرتبط هدایت می‌کند؛ ثبت بازبینی به‌صورت خوداظهاری است.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
