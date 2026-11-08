import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import {
  getStudentCourseConversationCourseTitle,
  getStudentCourseConversationList,
} from "@/server/student/course-conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گفت‌وگوهای دوره | دنا",
  robots: { index: false, follow: false },
};

function roleLabel(role: "teacher" | "academic_supporter" | "counselor") {
  if (role === "academic_supporter") return "پشتیبان تحصیلی";
  if (role === "counselor") return "مشاور دوره";
  return "مدرس";
}

function messageTime(value: Date) {
  return value.toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "short",
    timeStyle: "short",
  });
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

  const [conversations, courseTitle] = await Promise.all([
    getStudentCourseConversationList(actor.userId, courseId),
    getStudentCourseConversationCourseTitle(actor.userId, courseId),
  ]);
  if (!conversations || !courseTitle) notFound();

  return (
    <StudentShell active="courses" title="گفت‌وگوهای دوره">
      <div className="mx-auto max-w-2xl space-y-3 md:space-y-5">
        <Link href={`/student/courses/${courseId}`}
          className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex">
          بازگشت به جزئیات دوره
        </Link>

        <Card className="rounded-[22px] px-5 py-3.5">
          <h2 className="text-lg font-extrabold text-dena-deep">گفت‌وگوهای دوره</h2>
          <p className="mt-1 text-sm text-dena-muted">{courseTitle}</p>
        </Card>

        <Card className="rounded-[22px] p-4 sm:p-5">
          <h2 className="mb-4 text-base font-extrabold text-dena-deep">گفت‌وگوها</h2>
          {conversations.length === 0 ? (
            <div className="rounded-2xl bg-dena-bg px-4 py-6 text-center">
              <p className="font-bold text-dena-deep">هنوز گفت‌وگویی در این دوره ندارید.</p>
              <p className="mt-2 text-sm leading-7 text-dena-muted">
                از صفحهٔ پشتیبان یا مشاور دوره، گفت‌وگو را شروع کنید.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {conversations.map((conversation) => (
                <li key={conversation.conversationId}>
                  <Link
                    href={`/student/courses/${courseId}/team/${conversation.teamMemberId}/conversation`}
                    className="block rounded-2xl border border-dena-border bg-dena-bg p-3 transition-colors hover:border-dena-brand/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-dena-deep">{conversation.memberName}</h3>
                        <p className="mt-1 text-xs text-dena-muted">
                          {roleLabel(conversation.role)}
                          {conversation.lastMessageAt && <> · {messageTime(conversation.lastMessageAt)}</>}
                        </p>
                      </div>
                      <span aria-hidden="true" className="shrink-0 text-sm text-dena-muted">‹</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 border-t border-dena-border pt-4 text-center text-xs leading-6 text-dena-muted">
            شماره تماس و ایمیل شخصی اعضای تیم نمایش داده نمی‌شود.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
