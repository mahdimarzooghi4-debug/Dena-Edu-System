import { sql } from "drizzle-orm";
import { getDb } from "../../db";
/** Aggregate only; scopes are resolved from active memberships on every read. */
export async function getProviderMetrics(userId: string) {
  const rows = await getDb().execute(sql`WITH scopes AS (
    SELECT DISTINCT provider_id FROM dena_memberships WHERE user_id=${userId}::uuid
      AND role='provider' AND status='active' AND provider_id IS NOT NULL
  ) SELECT
    (SELECT count(*) FROM dena_courses WHERE provider_id IN (SELECT provider_id FROM scopes))::int AS courses,
    (SELECT count(*) FROM dena_courses WHERE provider_id IN (SELECT provider_id FROM scopes) AND publication_status='published')::int AS published,
    (SELECT count(*) FROM dena_provider_institute_collaborations WHERE provider_id IN (SELECT provider_id FROM scopes)
      AND withdrawn_at IS NULL AND status IN ('requested','awaiting_dena'))::int AS pending,
    (SELECT count(*) FROM dena_provider_institute_collaborations WHERE provider_id IN (SELECT provider_id FROM scopes)
      AND withdrawn_at IS NULL AND status='approved')::int AS approved
    WHERE EXISTS (SELECT 1 FROM scopes)`);
  if (!rows[0]) return null;
  return { courses:Number(rows[0].courses),published:Number(rows[0].published),pending:Number(rows[0].pending),approved:Number(rows[0].approved) };
}
