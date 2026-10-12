import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { memberships, verifiedEntities } from "../../db/schema";

/** Server-trusted user ID only. Neither a caller-supplied tenant ID nor
 * a role application by itself grants access to organizational scopes.
 * The join excludes missing or wrong-role entities, and intentionally omits
 * private evidence references, reviewer identity and personal member data.
 */
export async function getOrganizationScopes(userId: string) {
  const rows = await getDb().select({
    id: verifiedEntities.id,
    name: verifiedEntities.name,
    verifiedAt: verifiedEntities.verifiedAt,
  }).from(memberships).innerJoin(verifiedEntities, and(
    eq(memberships.organizationId, verifiedEntities.id),
    eq(verifiedEntities.role, "organization"),
  )).where(and(
    eq(memberships.userId, userId),
    eq(memberships.role, "organization"),
    eq(memberships.status, "active"),
  )).orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id));
  return rows;
}
