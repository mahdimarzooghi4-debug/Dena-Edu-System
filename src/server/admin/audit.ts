import { getDb } from "../../db";
import { auditLogs } from "../../db/schema";

export type AuditEntityType =
  | "SYSTEM"
  | "USER"
  | "COURSE"
  | "PRACTICE"
  | "MEDIA"
  | "ROLE_APPLICATION";

export type AuditInput = {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: AuditEntityType;
  entityId?: string | null;
};

/**
 * Central audit writer. Never accept secrets, tokens, OTP values,
 * media object keys or private student data as audit payloads.
 */
export async function writeAuditLog(input: AuditInput) {
  const db = getDb();
  return db.insert(auditLogs).values({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
  });
}
