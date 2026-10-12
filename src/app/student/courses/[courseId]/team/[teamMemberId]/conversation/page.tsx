import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { CourseConversationComposer } from "@/components/student/course-conversation-composer";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentCourseConversation } from "@/server/student/course-conversation";

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

  const conversation = await getStudentCourseConversation(
    actor.userId, courseId, teamMemberId,
  );
  if (!conversation) notFound();

  const label = roleLabel(conversation.member.role);

  return (
    <StudentShell active="courses" title="گفت‌وگوی دوره">
      <div className="space-y-6">
        <Link
          href={`/student/courses/${courseId}/team/${teamMemberId}`}
          className="text-sm font-bold text-dena-brand hover:underline"
        >
          بازگشت به {label}
        </Link>

        <Card className="rounded-[22px] p-5 md:p-7">
          <p className="text-xs font-bold text-dena-brand">{label}</p>
          <h2 className="mt-1 text-xl font-extrabold">
            {conversation.member.name}
          </h2>
          <p className="mt-2 text-xs leading-6 text-dena-muted">
            این گفت‌وگو فقط برای ارتباط آموزشی در چارچوب همین دوره است.
          </p>
        </Card>

        <Card className="rounded-[22px] p-4 md:p-6">
          <section
            aria-label="پیام‌های گفت‌وگو"
            className="flex min-h-[280px] flex-col gap-3"
          >
            {conversation.messages.length === 0 ? (
              <div className="m-auto max-w-sm text-center">
                <p className="font-bold">هنوز پیامی در این گفت‌وگو نیست.</p>
                <p className="mt-2 text-sm leading-7 text-dena-muted">
                  اولین پیام را می‌توانی از همین صفحه ارسال کنی.
                </p>
              </div>
            ) : (
              conversation.messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 " +
                    (message.sender === "student"
                      ? "self-start bg-dena-brand text-white"
                      : "self-end border border-dena-border bg-dena-bg text-dena-ink")
                  }
                >
                  <p>{message.body}</p>
                  <time
                    dateTime={message.createdAt.toISOString()}
                    className={
                      "mt-2 block text-[11px] " +
                      (message.sender === "student"
                        ? "text-white/75"
                        : "text-dena-muted")
                    }
                  >
                    {message.createdAt.toLocaleString("fa-IR")}
                  </time>
                </article>
              ))
            )}
          </section>

          <div className="mt-5 border-t border-dena-border pt-5">
            <CourseConversationComposer
              courseId={courseId}
              teamMemberId={teamMemberId}
            />
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}
