import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentProgressOverview } from "@/server/student/progress-overview";

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

  const overview = await getStudentProgressOverview(actor.userId);
  const available = overview.courses.filter(
    (course) => course.practice.state !== "not_available",
  );

  return (
    <StudentShell active="assessments" title="تمرین‌ها و آزمون‌ها">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">ارزیابی‌های من</p>
          <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">
            تمرین‌ها و ارزیابی‌های قابل دسترس
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            این صفحه فقط ارزیابی‌هایی را نشان می‌دهد که backend فعلی واقعاً
            برای دوره‌های قابل دسترس شما ثبت کرده است. آزمون یادگیری کامل و
            آزمون سراسری تا زمان تکمیل مدل رسمی آن‌ها جعل یا شبیه‌سازی نمی‌شوند.
          </p>
        </section>

        {available.length === 0 ? (
          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">
              فعلاً ارزیابی قابل دسترسی ندارید
            </h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              اگر برای یکی از دوره‌های شما ارزیابی تأییدشده فعال شود، از همین
              بخش قابل مشاهده خواهد بود.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {available.map((course) => (
              <li key={course.courseId}>
                <Card className="h-full rounded-[22px] p-6">
                  <p className="text-xs font-bold text-dena-brand">تمرین دوره</p>
                  <h2 className="mt-2 text-lg font-extrabold">{course.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-dena-muted">
                    {course.practice.state === "not_attempted"
                      ? "ارزیابی تأییدشده در انتظار پاسخ شماست."
                      : course.practice.correct
                        ? "پاسخ ثبت‌شده شما در این تمرین درست بوده است."
                        : "پاسخ شما ثبت شده است."}
                  </p>
                  <Link
                    href={`/student/courses/${course.courseId}/watch`}
                    className={buttonClassName(
                      course.practice.state === "not_attempted" ? "primary" : "outline",
                      "mt-5",
                    )}
                  >
                    {course.practice.state === "not_attempted"
                      ? "رفتن به ارزیابی"
                      : "مشاهده دوره"}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Card className="rounded-[22px] border-dashed p-5">
          <p className="text-xs leading-7 text-dena-muted">
            پاسخ صحیح یا کلید پاسخ برای ارزیابی‌های تکرارشونده به‌صورت عمومی
            نمایش داده نمی‌شود. منطق «نیاز به مرور» و تلاش جدید در migration
            و مدل ارزیابی رسمی بعدی پیاده خواهد شد.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
