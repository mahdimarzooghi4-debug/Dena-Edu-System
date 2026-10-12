import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { memberships, verifiedEntities } from "../../db/schema";

/** Only a trusted session user can call this scoped query. A benefactor
 * membership must link to an entity of that SAME verified role; neither an
 * application nor a different entity type can grant access. Evidence, reviewer
 * details and the identities of recipients are never selected.
 */
export async function getBenefactorScopes(userId: string) {
  return getDb().select({
    id: verifiedEntities.id,
    name: verifiedEntities.name,
    verifiedAt: verifiedEntities.verifiedAt,
  }).from(memberships).innerJoin(verifiedEntities, and(
    eq(memberships.benefactorId, verifiedEntities.id),
    eq(verifiedEntities.role, "benefactor"),
  )).where(and(
    eq(memberships.userId, userId),
    eq(memberships.role, "benefactor"),
    eq(memberships.status, "active"),
  )).orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id));
}
