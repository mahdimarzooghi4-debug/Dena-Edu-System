import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";
import { canReadTechnicalTicket } from "../../domain/access/policy";
import { toAccessContext } from "../access/membership";
import { getDb } from "../../db";
import {
  memberships, technicalSupportMessages, technicalSupportNotifications,
  technicalSupportTickets,
} from "../../db/schema";
import {
  addIranBusinessMinutes, iranBusinessMinutesBetween, SUPPORT_SLA_MINUTES,
  type SupportPriority,
} from "./sla";
import { selectLeastLoadedSupportOperator } from "./routing";

export const supportStatuses = [
  "new", "in_progress", "waiting_requester", "resolved", "closed",
] as const;
export type SupportStatus = typeof supportStatuses[number];
export const supportPriorities = ["low", "normal", "high", "urgent"] as const;

export const newTechnicalSupportTicket = z.object({
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(1).max(5000),
}).strict();

export const newTechnicalSupportMessage = z.object({
  body: z.string().trim().min(1).max(5000),
}).strict();

export const updateTechnicalSupportTicket = z.object({
  status: z.enum(supportStatuses).optional(),
  priority: z.enum(supportPriorities).optional(),
}).strict().refine((value) => value.status !== undefined || value.priority !== undefined);

const supportInboxCursorSchema = z.object({
  updatedAt: z.string().datetime(),
  id: z.uuid(),
}).strict();

export function encodeSupportInboxCursor(input: { updatedAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({
    updatedAt: input.updatedAt.toISOString(),
    id: input.id,
  })).toString("base64url");
}

export function decodeSupportInboxCursor(token: string) {
  if (token.length > 1024) return null;
  try {
    const parsed = supportInboxCursorSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    return { updatedAt: new Date(parsed.data.updatedAt), id: parsed.data.id };
  } catch {
    return null;
  }
}

async function activeActor(db: Pick<ReturnType<typeof getDb>, "select">, userId: string) {
  const rows = await db.select().from(memberships).where(and(
    eq(memberships.userId, userId), eq(memberships.status, "active"),
  )).for("update");
  return toAccessContext(userId, rows);
}

export async function listTechnicalSupportNotifications(userId: string) {
  const db = getDb();
  const actor = await activeActor(db, userId);
  if (!actor) return null;
  const rows = await db.select({
    id: technicalSupportNotifications.id,
    kind: technicalSupportNotifications.kind,
    readAt: technicalSupportNotifications.readAt,
    createdAt: technicalSupportNotifications.createdAt,
    ticketId: technicalSupportTickets.id,
    requesterUserId: technicalSupportTickets.requesterUserId,
    subject: technicalSupportTickets.subject,
  }).from(technicalSupportNotifications)
    .innerJoin(technicalSupportTickets,
      eq(technicalSupportTickets.id, technicalSupportNotifications.ticketId))
    .where(eq(technicalSupportNotifications.recipientUserId, userId))
    .orderBy(desc(technicalSupportNotifications.createdAt))
    .limit(50);
  return rows.filter((row) => canReadTechnicalTicket(actor, {
    ticketId: row.ticketId,
    requesterUserId: row.requesterUserId,
  })).map((row) => ({
    id: row.id,
    kind: row.kind,
    readAt: row.readAt,
    createdAt: row.createdAt,
    ticketId: row.ticketId,
    subject: row.subject,
  }));
}

export async function markTechnicalSupportNotificationRead(
  userId: string,
  notificationId: string,
) {
  return getDb().transaction(async (tx) => {
    const [notification] = await tx.select({
      id: technicalSupportNotifications.id,
      recipientUserId: technicalSupportNotifications.recipientUserId,
      ticketId: technicalSupportTickets.id,
      requesterUserId: technicalSupportTickets.requesterUserId,
    }).from(technicalSupportNotifications)
      .innerJoin(technicalSupportTickets,
        eq(technicalSupportTickets.id, technicalSupportNotifications.ticketId))
      .where(and(
        eq(technicalSupportNotifications.id, notificationId),
        eq(technicalSupportNotifications.recipientUserId, userId),
      )).for("update").limit(1);
    if (!notification) return false;
    const actor = await activeActor(tx, userId);
    if (!actor || !canReadTechnicalTicket(actor, {
      ticketId: notification.ticketId,
      requesterUserId: notification.requesterUserId,
    })) return false;
    await tx.update(technicalSupportNotifications).set({ readAt: new Date() })
      .where(and(
        eq(technicalSupportNotifications.id, notificationId),
        eq(technicalSupportNotifications.recipientUserId, userId),
      ));
    return true;
  });
}

export async function createTechnicalSupportTicket(
  userId: string,
  input: z.infer<typeof newTechnicalSupportTicket>,
) {
  return getDb().transaction(async (tx) => {
    const operators = await tx.select({ userId: memberships.userId })
      .from(memberships).where(and(
        eq(memberships.role, "admin"),
        eq(memberships.status, "active"),
        eq(memberships.canHandleTechnicalSupport, true),
      )).orderBy(memberships.userId).for("update");
    const actor = await activeActor(tx, userId);
    if (!actor) return null;
    const operatorIds = [...new Set(operators.map((row) => row.userId))];
    let assignedToUserId: string | null = null;
    if (operatorIds.length) {
      const activeTickets = await tx.select({
        userId: technicalSupportTickets.assignedToUserId,
      }).from(technicalSupportTickets).where(and(
        inArray(technicalSupportTickets.assignedToUserId, operatorIds),
        inArray(technicalSupportTickets.status, ["new", "in_progress", "waiting_requester"]),
      ));
      const workload = new Map(operatorIds.map((id) => [id, 0]));
      for (const ticket of activeTickets) {
        if (ticket.userId) workload.set(ticket.userId, (workload.get(ticket.userId) ?? 0) + 1);
      }
      assignedToUserId = selectLeastLoadedSupportOperator(operatorIds, workload);
    }
    const createdAt = new Date();
    const deadlines = SUPPORT_SLA_MINUTES.normal;
    const [ticket] = await tx.insert(technicalSupportTickets).values({
      requesterUserId: userId,
      assignedToUserId,
      subject: input.subject,
      firstResponseDueAt: addIranBusinessMinutes(createdAt, deadlines.firstResponse),
      resolutionDueAt: addIranBusinessMinutes(createdAt, deadlines.resolution),
    }).returning({
      id: technicalSupportTickets.id,
      subject: technicalSupportTickets.subject,
      status: technicalSupportTickets.status,
      priority: technicalSupportTickets.priority,
      firstResponseDueAt: technicalSupportTickets.firstResponseDueAt,
      resolutionDueAt: technicalSupportTickets.resolutionDueAt,
      createdAt: technicalSupportTickets.createdAt,
      updatedAt: technicalSupportTickets.updatedAt,
    });
    const [message] = await tx.insert(technicalSupportMessages).values({
      ticketId: ticket.id,
      authorUserId: userId,
      body: input.body,
    }).returning({
      id: technicalSupportMessages.id,
      body: technicalSupportMessages.body,
      createdAt: technicalSupportMessages.createdAt,
    });
    if (assignedToUserId) await tx.insert(technicalSupportNotifications).values({
      recipientUserId: assignedToUserId,
      ticketId: ticket.id,
      kind: "ticket_created",
    });
    return { ticket, message };
  });
}

export async function listRequesterTechnicalSupportTickets(
  userId: string, cursorToken?: string,
) {
  const actor = await activeActor(getDb(), userId);
  if (!actor) return null;
  const cursor = cursorToken ? decodeSupportInboxCursor(cursorToken) : null;
  if (cursorToken && !cursor) {
    return { tickets: [], nextCursor: null, invalidCursor: true };
  }
  const rows = await getDb().select({
    id: technicalSupportTickets.id,
    subject: technicalSupportTickets.subject,
    status: technicalSupportTickets.status,
    priority: technicalSupportTickets.priority,
    firstResponseDueAt: technicalSupportTickets.firstResponseDueAt,
    resolutionDueAt: technicalSupportTickets.resolutionDueAt,
    firstRespondedAt: technicalSupportTickets.firstRespondedAt,
    resolvedAt: technicalSupportTickets.resolvedAt,
    closedAt: technicalSupportTickets.closedAt,
    createdAt: technicalSupportTickets.createdAt,
    updatedAt: technicalSupportTickets.updatedAt,
  }).from(technicalSupportTickets).where(and(
    eq(technicalSupportTickets.requesterUserId, userId),
    ...(cursor ? [or(
      lt(technicalSupportTickets.updatedAt, cursor.updatedAt),
      and(eq(technicalSupportTickets.updatedAt, cursor.updatedAt),
        lt(technicalSupportTickets.id, cursor.id)),
    )!] : []),
  )).orderBy(desc(technicalSupportTickets.updatedAt),
    desc(technicalSupportTickets.id)).limit(51);
  const tickets = rows.slice(0, 50);
  return {
    tickets,
    nextCursor: rows.length > 50 && tickets.length
      ? encodeSupportInboxCursor(tickets[tickets.length - 1]!)
      : null,
    invalidCursor: false,
  };
}

export async function listTechnicalSupportInbox(userId: string, cursorToken?: string) {
  const actor = await activeActor(getDb(), userId);
  if (!actor?.memberships.some((membership) =>
    membership.role === "admin" && membership.canHandleTechnicalSupport)) return null;
  const cursor = cursorToken ? decodeSupportInboxCursor(cursorToken) : null;
  if (cursorToken && !cursor) {
    return { tickets: [], nextCursor: null, invalidCursor: true };
  }
  const rows = await getDb().select({
    id: technicalSupportTickets.id,
    subject: technicalSupportTickets.subject,
    status: technicalSupportTickets.status,
    priority: technicalSupportTickets.priority,
    assignedToUserId: technicalSupportTickets.assignedToUserId,
    firstResponseDueAt: technicalSupportTickets.firstResponseDueAt,
    resolutionDueAt: technicalSupportTickets.resolutionDueAt,
    createdAt: technicalSupportTickets.createdAt,
    updatedAt: technicalSupportTickets.updatedAt,
  }).from(technicalSupportTickets).where(cursor ? or(
    lt(technicalSupportTickets.updatedAt, cursor.updatedAt),
    and(eq(technicalSupportTickets.updatedAt, cursor.updatedAt),
      lt(technicalSupportTickets.id, cursor.id)),
  ) : undefined)
    .orderBy(desc(technicalSupportTickets.updatedAt),
      desc(technicalSupportTickets.id))
    .limit(101);
  const tickets = rows.slice(0, 100);
  return {
    tickets,
    nextCursor: rows.length > 100 && tickets.length
      ? encodeSupportInboxCursor(tickets[tickets.length - 1]!)
      : null,
    invalidCursor: false,
  };
}

export async function readTechnicalSupportTicket(userId: string, ticketId: string) {
  const db = getDb();
  const actor = await activeActor(db, userId);
  if (!actor) return null;
  const [ticket] = await db.select({
    id: technicalSupportTickets.id,
    requesterUserId: technicalSupportTickets.requesterUserId,
    subject: technicalSupportTickets.subject,
    status: technicalSupportTickets.status,
    priority: technicalSupportTickets.priority,
    firstResponseDueAt: technicalSupportTickets.firstResponseDueAt,
    resolutionDueAt: technicalSupportTickets.resolutionDueAt,
    firstRespondedAt: technicalSupportTickets.firstRespondedAt,
    resolvedAt: technicalSupportTickets.resolvedAt,
    closedAt: technicalSupportTickets.closedAt,
    createdAt: technicalSupportTickets.createdAt,
    updatedAt: technicalSupportTickets.updatedAt,
  }).from(technicalSupportTickets)
    .where(eq(technicalSupportTickets.id, ticketId)).limit(1);
  if (!ticket || !canReadTechnicalTicket(actor, {
    ticketId: ticket.id,
    requesterUserId: ticket.requesterUserId,
  })) return null;
  const recentMessages = await db.select({
    id: technicalSupportMessages.id,
    authorUserId: technicalSupportMessages.authorUserId,
    body: technicalSupportMessages.body,
    createdAt: technicalSupportMessages.createdAt,
  }).from(technicalSupportMessages)
    .where(eq(technicalSupportMessages.ticketId, ticketId))
    .orderBy(desc(technicalSupportMessages.createdAt))
    .limit(100);
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    firstResponseDueAt: ticket.firstResponseDueAt,
    resolutionDueAt: ticket.resolutionDueAt,
    firstRespondedAt: ticket.firstRespondedAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    messages: recentMessages.reverse().map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      fromSupport: message.authorUserId !== ticket.requesterUserId,
    })),
  };
}

export async function replyToTechnicalSupportTicket(
  userId: string,
  ticketId: string,
  body: string,
) {
  return getDb().transaction(async (tx) => {
    const [ticket] = await tx.select({
      id: technicalSupportTickets.id,
      requesterUserId: technicalSupportTickets.requesterUserId,
      assignedToUserId: technicalSupportTickets.assignedToUserId,
      status: technicalSupportTickets.status,
      priority: technicalSupportTickets.priority,
      resolutionDueAt: technicalSupportTickets.resolutionDueAt,
      resolutionPausedAt: technicalSupportTickets.resolutionPausedAt,
      firstRespondedAt: technicalSupportTickets.firstRespondedAt,
      createdAt: technicalSupportTickets.createdAt,
    }).from(technicalSupportTickets)
      .where(eq(technicalSupportTickets.id, ticketId))
      .for("update")
      .limit(1);
    if (!ticket) return null;
    const rows = await tx.select().from(memberships).where(and(
      eq(memberships.userId, userId), eq(memberships.status, "active"),
    )).for("update");
    const actor = toAccessContext(userId, rows);
    if (!actor || !canReadTechnicalTicket(actor, {
      ticketId: ticket.id,
      requesterUserId: ticket.requesterUserId,
    })) return null;
    const [message] = await tx.insert(technicalSupportMessages).values({
      ticketId,
      authorUserId: userId,
      body,
    }).returning({
      id: technicalSupportMessages.id,
      body: technicalSupportMessages.body,
      createdAt: technicalSupportMessages.createdAt,
    });
    const isSupport = actor.memberships.some((membership) =>
      membership.role === "admin" && membership.canHandleTechnicalSupport);
    const now = message.createdAt;
    let nextStatus = ticket.status as SupportStatus;
    let resolutionDueAt = ticket.resolutionDueAt;
    let resolutionPausedAt = ticket.resolutionPausedAt;
    let resolvedAt: Date | null | undefined;
    let closedAt: Date | null | undefined;
    if (isSupport && ["new", "waiting_requester", "resolved", "closed"].includes(nextStatus)) {
      if (nextStatus === "waiting_requester" && resolutionPausedAt) {
        const remaining = iranBusinessMinutesBetween(resolutionPausedAt, resolutionDueAt);
        resolutionDueAt = addIranBusinessMinutes(now, remaining);
        resolutionPausedAt = null;
      } else if (nextStatus === "resolved" || nextStatus === "closed") {
        resolutionDueAt = addIranBusinessMinutes(now,
          SUPPORT_SLA_MINUTES[ticket.priority as SupportPriority].resolution);
      }
      nextStatus = "in_progress";
      resolvedAt = null;
      closedAt = null;
    } else if (!isSupport && ["waiting_requester", "resolved", "closed"].includes(nextStatus)) {
      if (nextStatus === "waiting_requester" && resolutionPausedAt) {
        const remaining = iranBusinessMinutesBetween(resolutionPausedAt, resolutionDueAt);
        resolutionDueAt = addIranBusinessMinutes(now, remaining);
      } else {
        resolutionDueAt = addIranBusinessMinutes(now,
          SUPPORT_SLA_MINUTES[ticket.priority as SupportPriority].resolution);
      }
      resolutionPausedAt = null;
      nextStatus = "in_progress";
      resolvedAt = null;
      closedAt = null;
    }
    await tx.update(technicalSupportTickets).set({
      updatedAt: message.createdAt,
      status: nextStatus,
      resolutionDueAt,
      resolutionPausedAt,
      ...(isSupport && !ticket.firstRespondedAt ? { firstRespondedAt: now } : {}),
      ...(resolvedAt !== undefined ? { resolvedAt } : {}),
      ...(closedAt !== undefined ? { closedAt } : {}),
    }).where(eq(technicalSupportTickets.id, ticketId));
    const recipientUserId = isSupport
      ? ticket.requesterUserId
      : ticket.assignedToUserId;
    if (recipientUserId && recipientUserId !== userId) {
      await tx.insert(technicalSupportNotifications).values({
        recipientUserId,
        ticketId,
        kind: isSupport ? "support_replied" : "requester_replied",
      });
    }
    return message;
  });
}

export async function updateTechnicalSupportTicketByOperator(
  userId: string,
  ticketId: string,
  input: z.infer<typeof updateTechnicalSupportTicket>,
) {
  return getDb().transaction(async (tx) => {
    const [ticket] = await tx.select().from(technicalSupportTickets)
      .where(eq(technicalSupportTickets.id, ticketId)).for("update").limit(1);
    if (!ticket) return null;
    const actor = await activeActor(tx, userId);
    if (!actor?.memberships.some((membership) =>
      membership.role === "admin" && membership.canHandleTechnicalSupport)) return null;
    const now = new Date();
    const status = (input.status ?? ticket.status) as SupportStatus;
    const priority = (input.priority ?? ticket.priority) as SupportPriority;
    let firstResponseDueAt = ticket.firstResponseDueAt;
    let resolutionDueAt = ticket.resolutionDueAt;
    let resolutionPausedAt = ticket.resolutionPausedAt;
    if (input.priority && input.priority !== ticket.priority) {
      resolutionDueAt = addIranBusinessMinutes(now,
        SUPPORT_SLA_MINUTES[priority].resolution);
      if (resolutionPausedAt) resolutionPausedAt = now;
      if (!ticket.firstRespondedAt) {
        firstResponseDueAt = addIranBusinessMinutes(now,
          SUPPORT_SLA_MINUTES[priority].firstResponse);
      }
    }
    if (input.status && status !== ticket.status) {
      if (status === "waiting_requester" && ticket.status !== "waiting_requester") {
        resolutionPausedAt = now;
      } else if (ticket.status === "waiting_requester" && status !== "waiting_requester" && resolutionPausedAt) {
        resolutionDueAt = addIranBusinessMinutes(now,
          iranBusinessMinutesBetween(resolutionPausedAt, resolutionDueAt));
        resolutionPausedAt = null;
      }
    }
    const [updated] = await tx.update(technicalSupportTickets).set({
      status,
      priority,
      firstResponseDueAt,
      resolutionDueAt,
      resolutionPausedAt,
      resolvedAt: status === "resolved" ? (ticket.resolvedAt ?? now) : null,
      closedAt: status === "closed" ? (ticket.closedAt ?? now) : null,
      updatedAt: now,
    }).where(eq(technicalSupportTickets.id, ticketId)).returning({
      id: technicalSupportTickets.id,
      status: technicalSupportTickets.status,
      priority: technicalSupportTickets.priority,
      firstResponseDueAt: technicalSupportTickets.firstResponseDueAt,
      resolutionDueAt: technicalSupportTickets.resolutionDueAt,
      assignedToUserId: technicalSupportTickets.assignedToUserId,
      updatedAt: technicalSupportTickets.updatedAt,
    });
    if ((status !== ticket.status || priority !== ticket.priority) &&
        ticket.requesterUserId !== userId) {
      await tx.insert(technicalSupportNotifications).values({
        recipientUserId: ticket.requesterUserId,
        ticketId,
        kind: "ticket_updated",
      });
    }
    return updated;
  });
}
