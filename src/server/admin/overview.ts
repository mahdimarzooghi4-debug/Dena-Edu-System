import { count, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { courses, memberships } from "../../db/schema";

const roles = [
  "student",
  "provider",
  "institute",
  "admin",
  "organization",
  "benefactor",
] as const;

/**
 * Admin-only summary data. This intentionally returns aggregate values only.
 * It does not expose student progress, private notes, answers or evidence.
 */
export async function getAdminOverview() {
  const db = getDb();

  const [courseRows, roleRows] = await Promise.all([
    db.select({ total: count() }).from(courses),
    Promise.all(
      roles.map(async (role) => {
        const [row] = await db
          .select({ total: count() })
          .from(memberships)
          .where(eq(memberships.role, role));
        return [role, row?.total ?? 0] as const;
      }),
    ),
  ]);

  return {
    users: Object.fromEntries(roleRows),
    courses: {
      total: courseRows[0]?.total ?? 0,
    },
  };
}
