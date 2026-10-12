import { count, countDistinct, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courseLearningAssessments, coursePracticeQuestions, courses, memberships,
  supervisionGrants,
} from "../../db/schema";
import { getRecentAuditLogs } from "./audit";

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
          .select({ total: countDistinct(memberships.userId) })
          .from(memberships)
          .where(eq(memberships.role, role));
        return [role, row?.total ?? 0] as const;
      }),
    ),
  ]);
  const [supervisionRows, practiceRows, assessmentRows] = await Promise.all([
    db.select({ status: supervisionGrants.status, total: count() })
      .from(supervisionGrants).groupBy(supervisionGrants.status),
    db.select({ status: coursePracticeQuestions.reviewStatus, total: count() })
      .from(coursePracticeQuestions).groupBy(coursePracticeQuestions.reviewStatus),
    db.select({ status: courseLearningAssessments.reviewStatus, total: count() })
      .from(courseLearningAssessments).groupBy(courseLearningAssessments.reviewStatus),
  ]);
  const { events: recentAuditEvents } = await getRecentAuditLogs();

  const fillCounts = <T extends string>(
    statuses: readonly T[], rows: readonly { status: T; total: number }[],
  ) => Object.fromEntries(statuses.map((status) => [
    status, rows.find((row) => row.status === status)?.total ?? 0,
  ])) as Record<T, number>;

  return {
    users: Object.fromEntries(roleRows),
    courses: {
      total: courseRows[0]?.total ?? 0,
    },
    supervision: fillCounts(["requested", "approved", "revoked"] as const,
      supervisionRows),
    exercises: fillCounts(["pending", "approved", "rejected"] as const,
      practiceRows),
    learningAssessments: fillCounts(["pending", "approved", "rejected"] as const,
      assessmentRows),
    recentAuditEvents,
  };
}
