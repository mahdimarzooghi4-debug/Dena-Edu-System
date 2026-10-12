import { asc, count, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { roleApplications } from "../../db/schema";

/** Admin-only caller: summary deliberately excludes statements, applicant
 * identifiers, evidence references and private review decisions.
 * A dashboard link is NOT an authorization to decide a request.
 */
export async function getAdminReviewOverview() {
  const db = getDb();
  const [[total], rows] = await Promise.all([
    db.select({ pendingCount: count() }).from(roleApplications)
      .where(eq(roleApplications.status, "pending")),
    db.select({
      id: roleApplications.id,
      role: roleApplications.requestedRole,
      proposedName: roleApplications.proposedName,
      createdAt: roleApplications.createdAt,
    }).from(roleApplications)
      .where(eq(roleApplications.status, "pending"))
      .orderBy(asc(roleApplications.createdAt), asc(roleApplications.id))
      .limit(11),
  ]);
  return {
    pendingCount: total?.pendingCount ?? 0,
    pending: rows.slice(0, 10),
    hasMore: rows.length > 10,
  };
}
