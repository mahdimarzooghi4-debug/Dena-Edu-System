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
  return "مشاور دوره";
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
  const heading = conversation.member.role === "counselor"
    ? `${conversation.member.name} — مشاور دوره`
    : `${conversation.member.name} — ${label}`;

  return (
    <StudentShell active="courses" title="گفت‌وگوی دوره">
      <div className="-mt-1 mx-auto max-w-2xl space-y-4 md:mt-0">
        <Link
          href={`/student/courses/${courseId}/team/${teamMemberId}`}
          className="hidden text-sm font-bold text-dena-brand hover:underline md:inline-flex"
        >
          بازگشت به {label}
        </Link>

        <Card className="flex h-[78px] flex-col items-start justify-center rounded-[16px] px-4 text-right md:h-auto md:rounded-[22px] md:px-6 md:py-5">
          <h1 className="text-[18px] font-bold leading-7 text-dena-deep">{heading}</h1>
          <p className="text-[12px] leading-5 text-dena-muted">{courseTitle}</p>
        </Card>

        <section aria-label="پیام‌های گفت‌وگو" className="flex flex-col gap-4">
          {conversation.messages.length === 0 ? (
            <article className="flex min-h-[104px] w-[248px] max-w-full self-end flex-col justify-between rounded-[14px] border border-dena-border bg-white p-4 text-right md:w-fit md:max-w-[78%]">
              <p className="text-[12px] leading-5 text-dena-deep">
                هنوز پیامی در این گفت‌وگو نیست. پیام خود را در چارچوب همین دوره بنویسید.
              </p>
            </article>
          ) : conversation.messages.map((message) => {
            const fromStudent = message.sender === "student";
            return (
              <article
                key={message.id}
                className={
                  "flex min-h-[82px] w-[248px] max-w-full flex-col justify-between self-end rounded-[14px] border p-4 text-right md:w-fit md:max-w-[78%] " +
                  (fromStudent
                    ? "border-[#ede9fe] bg-[#ede9fe] text-dena-deep md:self-start"
                    : "border-dena-border bg-white text-dena-ink md:self-end")
                }
              >
                <p className="whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
                <time
                  dateTime={message.createdAt.toISOString()}
                  className="mt-2 block text-[10px] leading-4 text-dena-muted"
                >
                  {messageTime(message.createdAt)}
                </time>
              </article>
            );
          })}

          <CourseConversationComposer courseId={courseId} teamMemberId={teamMemberId} />
        </section>
      </div>
    </StudentShell>
  );
}
