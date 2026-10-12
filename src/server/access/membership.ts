import { accessContextSchema, type AccessContext } from "../../domain/access/contracts";
import type { memberships } from "../../db/schema";

type PersistedMembership = typeof memberships.$inferSelect;

/** Only feed rows obtained from trusted server-side DB queries. */
export function toAccessContext(
  userId: string,
  rows: readonly PersistedMembership[],
): AccessContext | null {
  const active = rows.filter((row) => row.status === "active");
  if (active.length === 0) return null;

  const claims = active.map((row) => {
    switch (row.role) {
      case "student": return { role: row.role };
      case "institute": return { role: row.role, instituteId: row.instituteId };
      case "provider": return { role: row.role, providerId: row.providerId };
      case "admin": return {
        role: row.role, canHandleTechnicalSupport: row.canHandleTechnicalSupport,
      };
      case "organization": return { role: row.role, organizationId: row.organizationId };
      case "benefactor": return { role: row.role, benefactorId: row.benefactorId };
      default: return { role: "invalid" };
    }
  });
  const parsed = accessContextSchema.safeParse({ userId, memberships: claims });
  // Schema-corrupt membership must fail closed instead of silently elevating a role.
  return parsed.success ? parsed.data : null;
}
