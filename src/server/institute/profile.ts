import { and, asc, inArray, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { verifiedEntities } from "../../db/schema";

/** Read only the verified institute identities in the current session scope. */
export async function getInstituteProfile(instituteIds: readonly string[]) {
  if (!instituteIds.length) return [];
  return getDb().select({
    id: verifiedEntities.id,
    name: verifiedEntities.name,
    verifiedAt: verifiedEntities.verifiedAt,
  }).from(verifiedEntities).where(and(
    inArray(verifiedEntities.id, [...new Set(instituteIds)]),
    eq(verifiedEntities.role, "institute"),
  )).orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id));
}
