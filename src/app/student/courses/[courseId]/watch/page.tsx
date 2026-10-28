import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { VideoProgress } from "@/components/student/video-progress";
import { getServerAccessContext } from "@/server/access/actor";
import { hasStudentEntitlement } from "@/server/student/entitlement";
import { configuredPrivateMediaOrigin } from "@/server/student/private-media";
import { getStudentVideoProgress } from "@/server/student/video-progress";
import { getStudentCourseDetail } from "@/server/student/course-detail";
import { getStudentCourseTeam } from "@/server/student/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مشاهده جلسه آموزشی | دنا",
  robots: { index: false, follow: false },
};

export default async function CourseWatchPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();

  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !await hasStudentEntitlement(actor.userId, courseId)) notFound();

  const detail = await getStudentCourseDetail(actor.userId, courseId);
  if (!detail || detail.enrollmentStatus !== "active") notFound();
  const [videos, team] = await Promise.all([
    getStudentVideoProgress(actor.userId, courseId),
    getStudentCourseTeam(actor.userId, courseId),
  ]);
  const enabled = Boolean(configuredPrivateMediaOrigin());
  const teacherName = team.find((member) => member.role === "teacher")?.name ?? null;
  const providerName = detail.providerName ?? detail.responsibleInstituteName;

  return (
    <StudentShell active="courses" title="مشاهده جلسه آموزشی">
      <div className="space-y-4">
        <Link href={`/student/courses/${courseId}`}
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به جزئیات دوره
        </Link>
        {!enabled && (
          <Card role="status" className="rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
            پخش محتوای خصوصی در این محیط هنوز فعال نشده است؛ پس از آماده‌شدن مجوز پخش، جلسه‌ها در فهرست این صفحه نمایش داده می‌شوند.
          </Card>
        )}
        <VideoProgress courseId={courseId} courseTitle={detail.title}
          providerName={providerName} teacherName={teacherName} videos={videos} />
        <p className="text-xs leading-7 text-dena-muted">
          دسترسی به هر ویدئو در هر درخواست دوباره با نشست دانش‌آموز، ثبت‌نام فعال و وضعیت نظارت همان دوره بررسی می‌شود.
        </p>
      </div>
    </StudentShell>
  );
}
