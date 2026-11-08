import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
const requestInput=z.object({orderId:z.uuid(),reason:z.string().trim().min(10).max(1500)}).strict();
const reviewInput=z.object({requestId:z.uuid(),decision:z.enum(["approved","rejected"]),note:z.string().trim().min(10).max(1500)}).strict();
export async function requestServiceRefund(userId:string,raw:unknown) {
  const parsed=requestInput.safeParse(raw);if(!parsed.success) return "invalid" as const;
  const input=parsed.data;
  return getDb().transaction(async(tx)=>{
    const orders=await tx.execute(sql`SELECT o.id FROM dena_institute_service_orders o
      JOIN dena_memberships m ON m.user_id=o.student_user_id AND m.role='student' AND m.status='active'
      WHERE o.id=${input.orderId}::uuid AND o.student_user_id=${userId}::uuid AND o.status='paid' AND o.paid_at IS NOT NULL
      FOR UPDATE OF o FOR SHARE OF m`);
    if(!orders.length) return "forbidden" as const;
    const existing=await tx.execute(sql`SELECT reason FROM dena_service_refund_requests WHERE order_id=${input.orderId}::uuid`);
    if(existing.length) return existing[0].reason===input.reason?"saved" as const:"conflict" as const;
    await tx.execute(sql`INSERT INTO dena_service_refund_requests(order_id,requested_by,reason)
      VALUES (${input.orderId}::uuid,${userId}::uuid,${input.reason})`);
    return "saved" as const;
  });
}
/** Review only: never marks money returned or changes financial balances/service entitlement. */
export async function reviewServiceRefund(userId:string,raw:unknown) {
  const parsed=reviewInput.safeParse(raw);if(!parsed.success) return "invalid" as const;
  const input=parsed.data;
  return getDb().transaction(async(tx)=>{
    const scope=await tx.execute(sql`SELECT o.id FROM dena_service_refund_requests r
      JOIN dena_institute_service_orders o ON o.id=r.order_id
      JOIN dena_memberships m ON m.institute_id=o.institute_id
      WHERE r.id=${input.requestId}::uuid AND o.status='paid' AND m.user_id=${userId}::uuid AND m.role='institute' AND m.status='active'
      FOR UPDATE OF o FOR SHARE OF m`);
    if(!scope.length) return "forbidden" as const;
    const changed=await tx.execute(sql`UPDATE dena_service_refund_requests SET status=${input.decision},review_note=${input.note},
      reviewed_by=${userId}::uuid,reviewed_at=now() WHERE id=${input.requestId}::uuid AND status='pending' RETURNING id`);
    if(changed.length) return "saved" as const;
    const replay=await tx.execute(sql`SELECT id FROM dena_service_refund_requests WHERE id=${input.requestId}::uuid
      AND status=${input.decision} AND review_note=${input.note}`);
    return replay.length?"saved" as const:"conflict" as const;
  });
}
export type ServiceRefundRow={id:string;order_id:string;title:string;gross_rials:string;reason:string;status:"pending"|"approved"|"rejected";review_note:string|null;created_at:Date|string};
export async function listServiceRefunds(userId:string,role:"student"|"institute") {
  const scope=role==="student"?sql`o.student_user_id=${userId}::uuid AND m.user_id=o.student_user_id`:sql`m.institute_id=o.institute_id`;
  const rows=await getDb().execute(sql`SELECT r.id,r.order_id,o.service_title_snapshot AS title,o.gross_rials::text,
    r.reason,r.status,r.review_note,r.created_at FROM dena_service_refund_requests r
    JOIN dena_institute_service_orders o ON o.id=r.order_id WHERE EXISTS (
      SELECT 1 FROM dena_memberships m WHERE m.user_id=${userId}::uuid AND m.role=${role} AND m.status='active' AND ${scope})
    ORDER BY r.created_at DESC,r.id DESC LIMIT 100`);
  return Array.from(rows) as ServiceRefundRow[];
}
