import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ServiceOrderConversation } from "../../../../components/services/service-order-conversation";
import { StudentShell } from "../../../../components/student/student-shell";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getServiceOrderConversation } from "../../../../server/student/service-order-messages";
import { listServiceOrderAttachments, supportAttachmentUploadAvailable } from "../../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پیام امن مشاوره | دنا", robots: { index: false, follow: false } };

export default async function ServiceOrderMessagesPage({ params }: { params: Promise<{ orderId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  const [conversation, attachments] = await Promise.all([
    getServiceOrderConversation(actor.userId, orderId),
    listServiceOrderAttachments(actor.userId, orderId),
  ]);
  if (!conversation || !attachments) notFound();
  // An actor may hold multiple memberships. Use the authorized role on this
  // order, not an arbitrary preferred global membership for back navigation.
  const role = conversation.role;

  const content = <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
    <Link href={role === "student" ? "/student/services/orders" : "/institute/service-orders"}
      className="inline-flex min-h-10 items-center text-sm font-bold text-dena-brand hover:underline">
      بازگشت به درخواست‌های خدمات
    </Link>
    <ServiceOrderConversation
      orderId={orderId}
      orderTitle={conversation.orderTitle}
      viewerRole={role}
      viewerUserId={actor.userId}
      initialMessages={conversation.messages}
      initialAttachments={attachments}
      uploadAvailable={supportAttachmentUploadAvailable()}
    />
  </div>;

  return role === "student"
    ? <StudentShell active="services" title="گفت‌وگوی امن">{content}</StudentShell>
    : <main id="main-content" className="min-h-screen">{content}</main>;
}
