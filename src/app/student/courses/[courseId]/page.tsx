import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { buttonClassName } from "../../../../components/ui/button";
import { CourseDetailAction } from "../../../../components/student/course-detail-action";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getStudentCourseDetail } from "../../../../server/student/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "جزئیات دورهٔ رایگان | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentCourseDetailPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const detail = await getStudentCourseDetail(actor.userId, courseId);
  if (!detail) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:py-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/student/courses"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به دوره‌های رایگان
        </Link>
        <Link href="/student" className={buttonClassName("secondary")}>
          خانه دانش‌آموز
        </Link>
      </header>
      <Card className="space-y-6 rounded-[24px] p-6 md:p-10">
        <div className="space-y-3">
          <p className="text-sm font-bold text-dena-brand">
            معرفی دورهٔ رایگانِ در دسترس
          </p>
          <h1 className="text-2xl font-extrabold leading-10">
            {detail.title}
          </h1>
          <p className="text-sm leading-8 text-dena-muted">
            این اطلاعات از وضعیت جاری انتشار و نظارت همان دوره در دنا
            خوانده شده است؛ تأیید داخلی دنا به معنی تأییدیهٔ قانونی،
            مجوز رسمی آموزشی یا گواهی پایان دوره نیست.
          </p>
        </div>
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">ارائه‌دهندهٔ ثبت‌شده</dt>
            <dd className="mt-2 font-extrabold leading-8">
              {detail.providerName}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">
              مؤسسهٔ مسئول نظارت این دوره
            </dt>
            <dd className="mt-2 font-extrabold leading-8">
              {detail.responsibleInstituteName}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">
              شمار ویدئوهای آمادهٔ فعلی
            </dt>
            <dd className="mt-2 text-2xl font-extrabold text-dena-brand">
              {detail.readyVideoCount.toLocaleString("fa-IR")}
            </dd>
          </div>
          <div className="rounded-xl bg-dena-bg p-5">
            <dt className="text-sm text-dena-muted">هزینهٔ ثبت‌نام</dt>
            <dd className="mt-2 font-extrabold">رایگان</dd>
          </div>
        </dl>
        <section aria-label="ثبت‌نام در دوره" className="space-y-4">
          <p className="text-sm leading-8 text-dena-muted">
            عنوان‌ها، شناسه‌ها، نشانی‌ها و متن‌های خصوصی ویدئوها پیش از
            ثبت‌نام در این صفحه منتشر نمی‌شوند. ثبت‌نام فقط برای
            همین دوره و پس از بررسی مجدد مجوزهای سمت سرور انجام می‌شود.
          </p>
          <CourseDetailAction courseId={detail.courseId}
            enrollmentStatus={detail.enrollmentStatus} />
        </section>
      </Card>
    </main>
  );
}
