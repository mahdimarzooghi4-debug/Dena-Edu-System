import { sql } from "drizzle-orm";
import { getDb } from "../../db";
export type ProviderRevenueRow={id:string;reference:string;institute_name:string;captured_at:Date|string;gross_rials:string;dena_share_rials:string;gateway_fee_rials:string;provider_share_rials:string;institute_net_rials:string};
/** Only actual immutable allocations; no absence-as-zero balance or settlement inference. */
export async function getProviderRevenue(userId:string) {
  const scope=sql`EXISTS (SELECT 1 FROM dena_memberships m WHERE m.user_id=${userId}::uuid
    AND m.provider_id=c.provider_id AND m.role='provider' AND m.status='active')`;
  const [rows,totals]=await Promise.all([
    getDb().execute(sql`SELECT a.id,d.reference,i.name AS institute_name,a.captured_at,a.gross_rials::text,a.dena_share_rials::text,
      a.gateway_fee_rials::text,a.provider_share_rials::text,a.institute_net_rials::text
      FROM dena_provider_revenue_allocations a JOIN dena_provider_compensation_drafts d ON d.id=a.contract_id
      JOIN dena_provider_institute_collaborations c ON c.id=d.collaboration_id
      JOIN dena_verified_entities i ON i.id=c.institute_id WHERE ${scope}
      ORDER BY a.captured_at DESC,a.id DESC LIMIT 100`),
    getDb().execute(sql`SELECT count(*)::text AS count,coalesce(sum(a.provider_share_rials),0)::text AS provider_total
      FROM dena_provider_revenue_allocations a JOIN dena_provider_compensation_drafts d ON d.id=a.contract_id
      JOIN dena_provider_institute_collaborations c ON c.id=d.collaboration_id WHERE ${scope}`),
  ]);
  return {rows:Array.from(rows) as ProviderRevenueRow[],totals:totals[0] as {count:string;provider_total:string}};
}
