import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../components/ui/card";
import { TicketReplyForm } from "../../../components/support/ticket-reply-form";
import { TicketOperationsForm } from "../../../components/support/ticket-operations-form";
import { TicketAttachments } from "../../../components/support/ticket-attachments";
import { getServerAccessContext } from "../../../server/access/actor";
import { readTechnicalSupportTicket } from "../../../server/support/tickets";
import { listSupportTicketAttachments, supportAttachmentUploadAvailable } from "../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "درخواست پشتیبانی | دنا", robots: { index: false, follow: false } };
type Props = { params: Promise<{ ticketId: string }> };
const statusLabels: Record<string, string> = {
  new: "جدید",
  in_progress: "در حال رسیدگی",
  waiting_requester: "منتظر پاسخ شما",
  resolved: "حل‌شده",
  closed: "بسته",
};
const priorityLabels: Record<string, string> = {
  low: "پایین", normal: "عادی", high: "بالا", urgent: "فوری",
};

export default async function SupportTicketPage({ params }: Props) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { ticketId } = await params;
  if (!z.uuid().safeParse(ticketId).success) notFound();
  const ticket = await readTechnicalSupportTicket(actor.userId, ticketId);
  if (!ticket) notFound();
  const attachments = await listSupportTicketAttachments(actor.userId, ticketId);
  if (!attachments) notFound();
  const canReply = actor.memberships.some((membership) =>
    membership.role === "admin" && membership.canHandleTechnicalSupport,
  );

  return (
    <main id="main-content" className="min-h-screen bg-dena-bg px-5 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={canReply ? "/admin/support" : "/support"}
          className="text-sm font-semibold text-dena-brand underline-offset-4 hover:underline">
          {canReply ? "بازگشت به صندوق ادمین" : "بازگشت به پشتیبانی"}
        </Link>
        <header>
          <h1 className="mt-4 text-2xl font-extrabold text-dena-deep">{ticket.subject}</h1>
          <p className="mt-2 text-xs text-dena-muted">ثبت‌شده در {ticket.createdAt.toLocaleString("fa-IR")}</p>
          <p className="mt-2 text-sm text-dena-muted">
            وضعیت: {statusLabels[ticket.status] ?? "نامشخص"}
            {canReply && <> · اولویت: {priorityLabels[ticket.priority] ?? "نامشخص"}</>}
          </p>
        </header>
        {canReply && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">رسیدگی به تیکت</h2>
            <TicketOperationsForm ticketId={ticket.id}
              initialStatus={ticket.status as "new" | "in_progress" | "waiting_requester" | "resolved" | "closed"}
              initialPriority={ticket.priority as "low" | "normal" | "high" | "urgent"} />
          </Card>
        )}
        <section aria-label="گفت‌وگوی تیکت" className="space-y-3">
          {ticket.messages.map((message) => (
            <Card key={message.id} className={message.fromSupport ? "border-dena-brand/30" : ""}>
              <p className="mb-2 text-xs font-bold text-dena-muted">
                {message.fromSupport ? "پشتیبانی دنا" : "شما"} · {message.createdAt.toLocaleString("fa-IR")}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>
            </Card>
          ))}
        </section>
        <Card>
          <TicketAttachments ticketId={ticket.id} attachments={attachments}
            uploadAvailable={supportAttachmentUploadAvailable()}
            remainingSlots={Math.max(0, 3 - attachments.filter((item) => item.status !== "failed").length)} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">افزودن پیام</h2>
          <TicketReplyForm ticketId={ticket.id} />
        </Card>
        {canReply && <p className="text-xs text-dena-muted">این حساب مجوز اپراتوری پشتیبانی دارد.</p>}
      </div>
    </main>
  );
}
