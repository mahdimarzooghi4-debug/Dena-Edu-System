import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { CourseConversationComposer } from "@/components/student/course-conversation-composer";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import {
  getStudentCourseConversation,
  getStudentCourseConversationCourseTitle,
} from "@/server/student/course-conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "گفت‌وگوی دوره | دنا",
  robots: { index: false, follow: false },
};

function roleLabel(role: "teacher" | "academic_supporter" | "counselor") {
  if (role === "teacher") return "مدرس";
  if (role === "academic_supporter") return "پشتیبان تحصیلی";
  return "مشاور";
}

function messageTime(value: Date) {
  return value.toLocaleTimeString("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CourseConversationPage({
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

  const [conversation, courseTitle] = await Promise.all([
    getStudentCourseConversation(actor.userId, courseId, teamMemberId),
    getStudentCourseConversationCourseTitle(actor.userId, courseId),
  ]);
  if (!conversation || !courseTitle) notFound();

  const label = roleLabel(conversation.member.role);

  return (
    <StudentShell active="courses" title="گفت‌وگوی دوره">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href={`/student/courses/${courseId}/team/${teamMemberId}`}
          className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex"
        >
          بازگشت به {label}
        </Link>

        <Card className="rounded-[22px] px-5 py-3.5">
          <h2 className="text-lg font-extrabold text-dena-deep">
            {conversation.member.name} — {label}
          </h2>
          <p className="mt-1 text-sm text-dena-muted">{courseTitle}</p>
        </Card>

        {conversation.messages.length === 0 ? (
          <Card className="flex min-h-36 items-center justify-center rounded-[22px] p-5 text-center">
            <p className="text-sm font-bold text-dena-muted">هنوز پیامی در این گفت‌وگو نیست.</p>
          </Card>
        ) : (
          <section aria-label="پیام‌های گفت‌وگو" className="flex min-h-44 flex-col gap-4 py-1">
            {conversation.messages.map((message) => {
              const fromStudent = message.sender === "student";
              return (
                <article
                  key={message.id}
                  className={
                    "max-w-[78%] rounded-[20px] px-4 py-3 text-sm leading-7 " +
                    (fromStudent
                      ? "self-start bg-dena-lavender text-dena-deep"
                      : "self-end border border-dena-border bg-white text-dena-ink")
                  }
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <time
                    dateTime={message.createdAt.toISOString()}
                    className="mt-1 block text-[10px] leading-4 text-dena-muted"
                  >
                    {messageTime(message.createdAt)}
                  </time>
                </article>
              );
            })}
          </section>
        )}

        <CourseConversationComposer
          courseId={courseId}
          teamMemberId={teamMemberId}
        />
      </div>
    </StudentShell>
  );
}
