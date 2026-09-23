import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getDb } from "../../../../../db";
import { courses } from "../../../../../db/schema";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { hasStudentEntitlement } from "../../../../../server/student/entitlement";
import { configuredPrivateMediaOrigin } from "../../../../../server/student/private-media";
import { getStudentVideoProgress } from "../../../../../server/student/video-progress";
import { VideoProgress } from "../../../../../components/student/video-progress";
import { StudentCoursePractice } from "../../../../../components/student/course-practice";
import { getStudentPractice } from "../../../../../server/student/course-practice";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "محتوای دوره | دنا", robots: { index: false, follow: false },
};

export default async function CourseWatchPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !await hasStudentEntitlement(actor.userId, courseId)) notFound();
  const db = getDb();
  const [course] = await db.select({ title: courses.title }).from(courses)
    .where(eq(courses.id, courseId)).limit(1);
  if (!course) notFound();
  const videos = await getStudentVideoProgress(actor.userId, courseId);
  const practice = await getStudentPractice(actor.userId, courseId);
  const enabled = Boolean(configuredPrivateMediaOrigin());
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-5 py-8 md:py-14">
      <Link href="/student/courses"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به دوره‌های رایگان
      </Link>
      <Card className="mt-6 space-y-6 rounded-[24px] p-6 md:p-10">
        <div>
          <p className="text-sm font-bold text-dena-brand">فقط برای دانش‌آموز ثبت‌نام‌شده</p>
          <h1 className="mt-3 text-2xl font-extrabold">{course.title}</h1>
          <p className="mt-3 text-sm leading-7 text-dena-muted">
            درخواست هر بخش از ویدئو دوباره با نشست، ثبت‌نام و وضعیت نظارت
            همان دوره سنجیده می‌شود. اشتراک‌گذاری نشانی این صفحه مجوز دسترسی ایجاد نمی‌کند.
          </p>
        </div>
        {!enabled && (
          <p role="status" className="rounded-xl bg-dena-bg p-4 text-sm text-dena-muted">
            پخش محتوای خصوصی در این محیط هنوز فعال نشده است.
          </p>
        )}
        {enabled && videos.length === 0 && (
          <p className="text-sm text-dena-muted">ویدئوی آماده‌ای برای این دوره وجود ندارد.</p>
        )}
        {enabled && videos.length > 0 && (
          <VideoProgress courseId={courseId} videos={videos} />
        )}
        {practice && (
          <StudentCoursePractice courseId={courseId} question={{
            ...practice,
            attempt: practice.attempt ? {
              ...practice.attempt,
              submittedAt: practice.attempt.submittedAt.toISOString(),
            } : null,
          }} />
        )}
        <p className="text-xs leading-7 text-dena-muted">
          امکان ذخیره‌سازی یا ضبط محتوای قابل پخش در دستگاه کاربر را نمی‌توان
          به‌طور قطعی از طریق کنترل دسترسی وب جلوگیری کرد.
        </p>
      </Card>
    </main>
  );
}
