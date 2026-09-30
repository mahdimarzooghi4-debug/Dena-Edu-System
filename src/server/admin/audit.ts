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
 * Audit persistence is intentionally disabled until the reviewed Drizzle
 * migration and retention policy are registered together. Failing closed is
 * safer than silently writing to an untracked table.
 */
export async function writeAuditLog(_input: AuditInput): Promise<never> {
  throw new Error("audit_log_not_enabled");
}
