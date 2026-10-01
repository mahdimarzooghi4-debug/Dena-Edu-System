import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { memberships, verifiedEntities } from "../../db/schema";

/** Trusted institute scopes for this signed-in user; never accept scope IDs
 * supplied by a browser without joining the active membership again. */
export async function getInstituteScopes(userId: string) {
  return getDb().select({
    id: verifiedEntities.id,
    name: verifiedEntities.name,
  }).from(memberships).innerJoin(verifiedEntities, and(
    eq(memberships.instituteId, verifiedEntities.id),
    eq(verifiedEntities.role, "institute"),
  )).where(and(
    eq(memberships.userId, userId),
    eq(memberships.role, "institute"),
    eq(memberships.status, "active"),
  )).orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id));
}
