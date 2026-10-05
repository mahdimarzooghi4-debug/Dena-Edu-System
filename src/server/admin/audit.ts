import { and, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { auditLogs } from "../../db/schema";
import type { Role } from "../../domain/access/contracts";

export type AuditEntityType =
  | "SYSTEM"
  | "USER"
  | "COURSE"
  | "PRACTICE"
  | "MEDIA"
  | "ROLE_APPLICATION"
  | "ASSESSMENT_QUESTION"
  | "ASSESSMENT_EXAM"
  | "ORGANIZATION_STUDENT"
  | "ORGANIZATION_API_KEY"
  | "INSTITUTE_SERVICE"
  | "SERVICE_ORDER"
  | "PROVIDER_COLLABORATION"
  | "EDUCATOR_AFFILIATION";

export const auditActions = [
  "role_application.approved",
  "role_application.rejected",
  "course.supervision.requested",
  "course.supervision.approved",
  "course.supervision.rejected",
  "course.supervision.revoked",
  "course.practice.approved",
  "course.practice.rejected",
  "course.learning_assessment.approved",
  "course.learning_assessment.rejected",
  "institute.assessment.question.created",
  "institute.assessment.question.updated",
  "admin.dena_question.created",
  "admin.dena_question.updated",
  "institute.exam.created",
  "admin.dena_exam.created",
  "institute.exam.published",
  "institute.exam.cancelled",
  "admin.dena_exam.published",
  "admin.dena_exam.cancelled",
  "institute.service.created",
  "institute.service.updated",
  "student.service_order.created",
  "student.service_order.cancelled",
  "institute.service_order.guardian_consent_confirmed",
  "provider.collaboration.requested",
  "provider.collaboration.withdrawn",
  "institute.provider_collaboration.accepted",
  "institute.provider_collaboration.rejected",
  "admin.provider_collaboration.approved",
  "admin.provider_collaboration.rejected",
  "educator.affiliation.requested",
  "educator.affiliation.withdrawn",
  "institute.educator_affiliation.approved",
  "institute.educator_affiliation.rejected",
  "institute.educator_affiliation.revoked",
  "institute.course_ownership.transferred",
] as const;
export type AuditAction = (typeof auditActions)[number];

export type AuditInput = {
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
};

const actionSet = new Set<string>(auditActions);

/** Shared record builder for direct and transaction-scoped inserts. It only
 * accepts fixed action keys; caller data such as reason text never enters logs.
 */
export function auditLogRecord(input: AuditInput) {
  if (!actionSet.has(input.action)) throw new Error("invalid_audit_action");
  return {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
  };
}

export async function writeAuditLog(input: AuditInput) {
  const [record] = await getDb().insert(auditLogs)
    .values(auditLogRecord(input)).returning({ id: auditLogs.id });
  return record;
}

const auditCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.uuid(),
}).strict();

export function encodeAuditCursor(input: { createdAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({
    createdAt: input.createdAt.toISOString(),
    id: input.id,
  })).toString("base64url");
}

export function decodeAuditCursor(token: string) {
  if (token.length > 1024) return null;
  try {
    const parsed = auditCursorSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    return { createdAt: new Date(parsed.data.createdAt), id: parsed.data.id };
  } catch {
    return null;
  }
}

/** Bounded, stable keyset pagination for the admin audit panel. */
export async function getRecentAuditLogs(cursorToken?: string) {
  const cursor = cursorToken ? decodeAuditCursor(cursorToken) : null;
  if (cursorToken && !cursor) {
    return { events: [], nextCursor: null, invalidCursor: true };
  }
  const rows = await getDb().select({
    id: auditLogs.id,
    actorId: auditLogs.actorId,
    actorRole: auditLogs.actorRole,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs).where(cursor ? or(
    lt(auditLogs.createdAt, cursor.createdAt),
    and(eq(auditLogs.createdAt, cursor.createdAt),
      lt(auditLogs.id, cursor.id)),
  ) : undefined)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(51);
  const events = rows.slice(0, 50);
  return {
    events,
    nextCursor: rows.length > 50 && events.length
      ? encodeAuditCursor(events[events.length - 1]!)
      : null,
    invalidCursor: false,
  };
}
