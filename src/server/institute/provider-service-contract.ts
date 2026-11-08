import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
export async function getServiceContractOptions(userId:string,serviceId:string) {
  const rows=await getDb().execute(sql`SELECT d.id,d.reference,p.name AS provider_name,
    (b.contract_id=d.id) AS selected FROM dena_institute_services s
    JOIN dena_provider_institute_collaborations c ON c.institute_id=s.institute_id
    JOIN dena_provider_compensation_drafts d ON d.collaboration_id=c.id
    JOIN dena_verified_entities p ON p.id=c.provider_id
    LEFT JOIN dena_provider_service_contracts b ON b.service_id=s.id
    WHERE s.id=${serviceId}::uuid AND d.status='active' AND c.status='approved' AND c.withdrawn_at IS NULL
    AND d.proposed_start<=(now() AT TIME ZONE 'Asia/Tehran')::date
    AND (d.proposed_end IS NULL OR d.proposed_end>=(now() AT TIME ZONE 'Asia/Tehran')::date)
    AND EXISTS (SELECT 1 FROM dena_memberships m WHERE m.user_id=${userId}::uuid AND m.institute_id=s.institute_id AND m.role='institute' AND m.status='active')
    ORDER BY p.name,d.reference LIMIT 200`);
  return Array.from(rows) as {id:string;reference:string;provider_name:string;selected:boolean|null}[];
}
export async function bindServiceContract(userId:string,serviceId:string,contractId:string) {
  if(!z.uuid().safeParse(serviceId).success||!z.uuid().safeParse(contractId).success) return "invalid" as const;
  return getDb().transaction(async(tx)=>{
    const services=await tx.execute(sql`SELECT s.id FROM dena_institute_services s JOIN dena_memberships m ON m.institute_id=s.institute_id
      WHERE s.id=${serviceId}::uuid AND m.user_id=${userId}::uuid AND m.role='institute' AND m.status='active'
      FOR UPDATE OF s FOR SHARE OF m`);
    if(!services.length) return "forbidden" as const;
    const contracts=await tx.execute(sql`SELECT d.id FROM dena_provider_compensation_drafts d
      JOIN dena_provider_institute_collaborations c ON c.id=d.collaboration_id
      JOIN dena_institute_services s ON s.institute_id=c.institute_id
      WHERE s.id=${serviceId}::uuid AND d.id=${contractId}::uuid AND d.status='active' AND c.status='approved' AND c.withdrawn_at IS NULL
      AND d.proposed_start<=(now() AT TIME ZONE 'Asia/Tehran')::date
      AND (d.proposed_end IS NULL OR d.proposed_end>=(now() AT TIME ZONE 'Asia/Tehran')::date) FOR SHARE OF d,c`);
    if(!contracts.length) return "unavailable" as const;
    await tx.execute(sql`INSERT INTO dena_provider_service_contracts(service_id,contract_id,assigned_by)
      VALUES (${serviceId}::uuid,${contractId}::uuid,${userId}::uuid)
      ON CONFLICT(service_id) DO UPDATE SET contract_id=excluded.contract_id,assigned_by=excluded.assigned_by,assigned_at=now()`);
    return "saved" as const;
  });
}
