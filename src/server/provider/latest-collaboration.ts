import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import type { ProviderCollaborationStatus } from "./collaboration-contracts";
export async function getLatestProviderCollaboration(userId: string, providerId: string) {
  const rows = await getDb().execute(sql`SELECT c.id,e.name AS institute_name,
    CASE WHEN c.withdrawn_at IS NOT NULL THEN 'withdrawn' ELSE c.status::text END AS status
    FROM dena_provider_institute_collaborations c
    JOIN dena_verified_entities e ON e.id=c.institute_id AND e.role='institute'
    WHERE c.provider_id=${providerId}::uuid AND EXISTS (
      SELECT 1 FROM dena_memberships m WHERE m.user_id=${userId}::uuid
      AND m.provider_id=c.provider_id AND m.role='provider' AND m.status='active'
    ) ORDER BY c.created_at DESC,c.id DESC LIMIT 1`);
  return (rows[0] as {id:string;institute_name:string;status:ProviderCollaborationStatus}|undefined) ?? null;
}
