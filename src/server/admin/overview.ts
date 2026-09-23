import { count } from "drizzle-orm";
import { getDb } from "../../db";
import { courses, memberships } from "../../db/schema";

/**
 * Admin-only summary data. This intentionally returns aggregate values only.
 * It does not expose student progress, private notes, answers or evidence.
 */
export async function getAdminOverview() {
  const db = getDb();

  const [[users], [courseCount]] = await Promise.all([
    db.select({ total: count() }).from(memberships),
    db.select({ total: count() }).from(courses),
  ]);

  return {
    users: {
      totalMemberships: users?.total ?? 0,
    },
    courses: {
      total: courseCount?.total ?? 0,
    },
  };
}
