import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { CourseTeamReplyComposer } from "@/components/course-team/conversation-reply-composer";
import { getServerIdentity } from "@/server/access/actor";
import { getCourseTeamConversation } from "@/server/course-team/conversations";

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

export default async function CourseTeamConversationPage({
  params,
}: {
  params: Promise<{ teamMemberId: string; conversationId: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }

  const identity = await getServerIdentity();
  if (!identity) redirect("/login");

  const { teamMemberId, conversationId } = await params;
  if (!z.uuid().safeParse(teamMemberId).success ||
      !z.uuid().safeParse(conversationId).success) {
    notFound();
  }

  const conversation = await getCourseTeamConversation(
    identity.userId,
    teamMemberId,
    conversationId,
  );
  if (!conversation) notFound();

  const label = roleLabel(conversation.assignment.role);

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-4xl space-y-6 px-5 py-8 md:px-10 md:py-12">
      <Link href="/course-team"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به گفت‌وگوهای دوره
      </Link>

      <Card className="rounded-[22px] p-6 md:p-8">
        <p className="text-xs font-bold text-dena-brand">
          {label} · {conversation.assignment.courseTitle}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold">
          گفت‌وگو با {conversation.student.name}
        </h1>
        <p className="mt-3 text-sm leading-7 text-dena-muted">
          این گفت‌وگو فقط به همین assignment و همین دوره تعلق دارد.
        </p>
      </Card>

      <Card className="rounded-[22px] p-5 md:p-6">
        {conversation.messages.length === 0 ? (
          <p className="text-sm text-dena-muted">هنوز پیامی ثبت نشده است.</p>
        ) : (
          <ol className="space-y-3">
            {conversation.messages.map((message) => {
              const own = message.sender === "team_member";
              return (
                <li
                  key={message.id}
                  className={
                    "max-w-[86%] rounded-2xl px-4 py-3 " +
                    (own
                      ? "mr-auto bg-dena-lavender text-dena-deep"
                      : "ml-auto border border-dena-border bg-white")
                  }
                >
                  <p className="text-xs font-bold text-dena-muted">
                    {own ? label : "دانش‌آموز"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7">
                    {message.body}
                  </p>
                  <time className="mt-2 block text-[11px] text-dena-muted">
                    {message.createdAt.toLocaleString("fa-IR")}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card className="rounded-[22px] p-5 md:p-6">
        <CourseTeamReplyComposer
          teamMemberId={teamMemberId}
          conversationId={conversationId}
        />
      </Card>
    </main>
  );
}
