import { and, asc, inArray, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { memberships, user } from "../../db/schema";

export async function getInstituteMembershipDirectory(
  instituteIds: readonly string[],
) {
  if (!instituteIds.length) return [];
  return getDb().select({
    membershipId: memberships.id,
    name: user.name,
    role: memberships.role,
    status: memberships.status,
    createdAt: memberships.createdAt,
  }).from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(and(
      eq(memberships.role, "institute"),
      inArray(memberships.instituteId, [...instituteIds]),
    ))
    .orderBy(asc(user.name), asc(memberships.createdAt))
    .limit(1000);
}
