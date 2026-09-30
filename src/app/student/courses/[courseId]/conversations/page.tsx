import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentCourseConversationList } from "@/server/student/course-conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گفت‌وگوهای دوره | دنا",
  robots: { index: false, follow: false },
};

function roleLabel(role: "academic_supporter" | "counselor") {
  return role === "academic_supporter" ? "پشتیبان تحصیلی" : "مشاور";
}

export default async function CourseConversationsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();

  const conversations = await getStudentCourseConversationList(
    actor.userId,
    courseId,
  );
  if (!conversations) notFound();

  return (
    <StudentShell active="courses" title="گفت‌وگوهای دوره">
      <div className="space-y-6">
        <Link
          href={`/student/courses/${courseId}`}
          className="text-sm font-bold text-dena-brand hover:underline"
        >
          بازگشت به جزئیات دوره
        </Link>

        <div>
          <h2 className="text-2xl font-extrabold">گفت‌وگوهای دوره</h2>
          <p className="mt-2 text-sm leading-8 text-dena-muted">
            فقط گفت‌وگوهای واقعی شما با پشتیبان تحصیلی یا مشاور همین دوره
            در این بخش نمایش داده می‌شوند.
          </p>
        </div>

        {conversations.length === 0 ? (
          <Card className="rounded-[22px] p-6">
            <p className="font-bold">هنوز گفت‌وگویی در این دوره ندارید.</p>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              از بخش تیم آموزشی دوره وارد پروفایل پشتیبان تحصیلی یا مشاور شوید
              و در صورت فعال بودن ارتباط، گفت‌وگو را آغاز کنید.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {conversations.map((conversation) => (
              <li key={conversation.conversationId}>
                <Link
                  href={`/student/courses/${courseId}/team/${conversation.teamMemberId}/conversation`}
                  className="block rounded-[22px] border border-dena-border bg-white p-5 transition hover:border-dena-brand hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-dena-brand">
                        {roleLabel(conversation.role)}
                      </p>
                      <h3 className="mt-2 text-lg font-extrabold">
                        {conversation.memberName}
                      </h3>
                    </div>
                    {conversation.lastMessageAt && (
                      <time className="text-xs text-dena-muted">
                        {conversation.lastMessageAt.toLocaleString("fa-IR")}
                      </time>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-dena-muted">
                    بازکردن گفت‌وگوی همین دوره
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StudentShell>
  );
}
