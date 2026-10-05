import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { verifiedEntities } from "../../db/schema";

/** Read only the verified provider identities in the current session scope. */
export async function getProviderProfile(providerIds: readonly string[]) {
  if (!providerIds.length) return [];
  return getDb().select({
    id: verifiedEntities.id,
    name: verifiedEntities.name,
    verifiedAt: verifiedEntities.verifiedAt,
  }).from(verifiedEntities).where(and(
    inArray(verifiedEntities.id, [...new Set(providerIds)]),
    eq(verifiedEntities.role, "provider"),
  )).orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id));
}
