import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { compensationDraftInput, type CompensationDraftRow } from "../../lib/provider-compensation";
export async function getCompensationCollaborations(userId:string) {
  const rows=await getDb().execute(sql`SELECT c.id,p.name AS provider_name,i.name AS institute_name
    FROM dena_provider_institute_collaborations c
    JOIN dena_verified_entities p ON p.id=c.provider_id AND p.role='provider'
    JOIN dena_verified_entities i ON i.id=c.institute_id AND i.role='institute'
    WHERE c.status='approved' AND c.withdrawn_at IS NULL AND EXISTS (
      SELECT 1 FROM dena_memberships m WHERE m.user_id=${userId}::uuid AND m.institute_id=c.institute_id
      AND m.role='institute' AND m.status='active'
    ) ORDER BY i.name,p.name,c.id LIMIT 200`);
  return Array.from(rows) as {id:string;provider_name:string;institute_name:string}[];
}
export async function listCompensationDrafts(userId:string, role:"provider"|"institute") {
  const scope=role==="provider" ? sql`m.provider_id=c.provider_id` : sql`m.institute_id=c.institute_id`;
  const rows=await getDb().execute(sql`SELECT d.id,d.collaboration_id,p.name AS provider_name,i.name AS institute_name,
    d.reference,d.share_basis,d.share_basis_points,d.proposed_start::text,d.proposed_end::text,d.settlement_terms,d.status,d.created_at
    FROM dena_provider_compensation_drafts d JOIN dena_provider_institute_collaborations c ON c.id=d.collaboration_id
    JOIN dena_verified_entities p ON p.id=c.provider_id AND p.role='provider'
    JOIN dena_verified_entities i ON i.id=c.institute_id AND i.role='institute'
    WHERE EXISTS (SELECT 1 FROM dena_memberships m WHERE m.user_id=${userId}::uuid
      AND m.role=${role} AND m.status='active' AND ${scope})
    ORDER BY d.created_at DESC,d.id DESC LIMIT 100`);
  return Array.from(rows) as CompensationDraftRow[];
}
/** Records a proposal only. This cannot activate terms, create ledger entries or move money. */
export async function createCompensationDraft(userId:string,raw:unknown) {
  const parsed=compensationDraftInput.safeParse(raw);
  if(!parsed.success) return "invalid" as const;
  const data=parsed.data;
  return getDb().transaction(async(tx)=>{
    const allowed=await tx.execute(sql`SELECT c.id FROM dena_provider_institute_collaborations c
      JOIN dena_memberships m ON m.institute_id=c.institute_id
      WHERE c.id=${data.collaborationId}::uuid AND c.status='approved' AND c.withdrawn_at IS NULL
      AND m.user_id=${userId}::uuid AND m.role='institute' AND m.status='active' FOR SHARE OF c,m`);
    if(!allowed.length) return "forbidden" as const;
    const inserted=await tx.execute(sql`INSERT INTO dena_provider_compensation_drafts
      (collaboration_id,client_request_id,reference,share_basis,share_basis_points,proposed_start,proposed_end,settlement_terms,created_by)
      VALUES (${data.collaborationId}::uuid,${data.clientRequestId}::uuid,${data.reference},${data.shareBasis},
        ${data.shareBasisPoints},${data.proposedStart}::date,${data.proposedEnd}::date,${data.settlementTerms},${userId}::uuid)
      ON CONFLICT (collaboration_id,client_request_id) DO NOTHING RETURNING id`);
    if(inserted.length) return "saved" as const;
    const replay=await tx.execute(sql`SELECT id FROM dena_provider_compensation_drafts
      WHERE collaboration_id=${data.collaborationId}::uuid AND client_request_id=${data.clientRequestId}::uuid
      AND reference=${data.reference} AND share_basis=${data.shareBasis} AND share_basis_points=${data.shareBasisPoints}
      AND proposed_start=${data.proposedStart}::date AND proposed_end IS NOT DISTINCT FROM ${data.proposedEnd}::date
      AND settlement_terms=${data.settlementTerms}`);
    return replay.length ? "saved" as const : "conflict" as const;
  });
}
