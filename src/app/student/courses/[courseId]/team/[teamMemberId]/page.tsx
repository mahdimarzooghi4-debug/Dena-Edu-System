import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentCourseTeamMember } from "@/server/student/course-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "عضو تیم آموزشی | دنا",
  robots: { index: false, follow: false },
};

function roleLabel(role: "teacher" | "academic_supporter" | "counselor") {
  if (role === "teacher") return "مدرس";
  if (role === "academic_supporter") return "پشتیبان تحصیلی";
  return "مشاور";
}

export default async function CourseTeamMemberPage({
  params,
}: {
  params: Promise<{ courseId: string; teamMemberId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const { courseId, teamMemberId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(teamMemberId).success) notFound();

  const member = await getStudentCourseTeamMember(
    actor.userId, courseId, teamMemberId,
  );
  if (!member) notFound();

  const label = roleLabel(member.role);

  return (
    <StudentShell active="courses" title={label}>
      <div className="space-y-6">
        <Link
          href={`/student/courses/${courseId}`}
          className="text-sm font-bold text-dena-brand hover:underline"
        >
          بازگشت به جزئیات دوره
        </Link>

        <Card className="rounded-[22px] p-6 md:p-8">
          <p className="text-sm font-bold text-dena-brand">{label}</p>
          <h2 className="mt-2 text-2xl font-extrabold">{member.name}</h2>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-dena-bg p-4">
              <dt className="text-xs text-dena-muted">دوره</dt>
              <dd className="mt-2 font-bold">{member.courseTitle}</dd>
            </div>
            <div className="rounded-2xl bg-dena-bg p-4">
              <dt className="text-xs text-dena-muted">نقش در این دوره</dt>
              <dd className="mt-2 font-bold">{label}</dd>
            </div>
          </dl>

          <p className="mt-5 text-sm leading-8 text-dena-muted">
            ارتباط با این عضو فقط در چارچوب همین دوره انجام می‌شود و اطلاعات
            تماس شخصی او در این بخش نمایش داده نمی‌شود.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/student/courses/${courseId}/team/${teamMemberId}/conversation`}
              className={buttonClassName()}
            >
              مشاهده گفت‌وگو
            </Link>
          </div>
        </Card>

        {member.role === "academic_supporter" && (
          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">جلسات رفع اشکال</h2>
            <p className="mt-2 text-sm leading-8 text-dena-muted">
              پشتیبان تحصیلی نقش مرتبط با جلسات رفع اشکال این دوره است.
              زمان‌بندی و درخواست جلسه در slice بعدی backend فعال می‌شود و
              تا آن زمان هیچ جلسه فرضی نمایش داده نمی‌شود.
            </p>
          </Card>
        )}

        {member.role === "counselor" && (
          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">تعامل با مشاور</h2>
            <p className="mt-2 text-sm leading-8 text-dena-muted">
              نوع خدمات مشاور توسط مؤسسه تعریف می‌شود. دنا در این مرحله
              مسئولیت یا نوع جلسه‌ای فراتر از گفت‌وگوی مجاز دوره فرض نمی‌کند.
            </p>
          </Card>
        )}
      </div>
    </StudentShell>
  );
}
