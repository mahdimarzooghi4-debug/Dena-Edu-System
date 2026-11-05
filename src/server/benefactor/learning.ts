import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { memberships } from "../../db/schema";

/** Select only opaque recipient aliases and authorized course-level learning data. */
export async function getBenefactorLearning(userId: string, recipientId?: string) {
  return getDb().execute<{
    recipient_id: string; course_title: string; publication_status: string;
    total_videos: number; completed_videos: number; last_activity: string | null;
  }>(sql`
    SELECT r.id AS recipient_id, c.title AS course_title, c.publication_status,
      count(DISTINCT v.id)::int AS total_videos,
      count(DISTINCT done.id)::int AS completed_videos,
      max(done.completed_at)::text AS last_activity
    FROM dena_benefactor_recipients r
    JOIN dena_benefactor_learning_grants g ON g.recipient_id = r.id AND g.revoked_at IS NULL
    JOIN dena_student_enrollments e ON e.id = g.enrollment_id
      AND e.student_user_id = r.student_user_id AND e.status = 'active'
    JOIN dena_courses c ON c.id = e.course_id
    LEFT JOIN dena_private_media_assets v ON v.course_id = c.id AND v.status = 'ready'
    LEFT JOIN dena_student_video_completions done ON done.asset_id = v.id AND done.student_user_id = r.student_user_id
    WHERE EXISTS (SELECT 1 FROM ${memberships} m
      WHERE m.user_id = ${userId} AND m.benefactor_id = r.benefactor_id
        AND m.role = 'benefactor' AND m.status = 'active')
      ${recipientId ? sql`AND r.id = ${recipientId}` : sql``}
    GROUP BY r.id, c.id ORDER BY r.id, c.title, c.id
  `);
}
