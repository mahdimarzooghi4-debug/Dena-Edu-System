import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { calculateProviderCompensation } from "./provider-compensation";
import { postFinancialJournal } from "./ledger";
import type { compensationBasisLabels } from "../../lib/provider-compensation";

const verifiedRevenueInput=z.object({
  eventKey:z.string().regex(/^[a-zA-Z0-9_.:-]{8,120}$/),
  sourceId:z.uuid(),contractId:z.uuid(),capturedAt:z.iso.datetime({offset:true}),
  grossRials:z.number().int().min(10).max(Number.MAX_SAFE_INTEGER).refine(value=>value%10===0),
  gatewayFeeRials:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
}).strict();
export type VerifiedProviderRevenue=z.infer<typeof verifiedRevenueInput>;

/** INTERNAL adapter boundary. Call only after authenticating a capture, reconciling its
 * amount/source with a server-owned purchase and its bound contract. No public route or
 * gateway adapter currently calls this function; it cannot verify a PSP by itself.
 * One final capture per source; partial/multiple captures and refunds are unsupported.
 */
export async function recordVerifiedProviderRevenue(raw:VerifiedProviderRevenue) {
  const input=verifiedRevenueInput.parse(raw);
  return getDb().transaction(async(tx)=>{
    // All captures/activations for the collaboration use the same lock order.
    const contracts=await tx.execute(sql`SELECT d.id,d.share_basis,d.share_basis_points,
      d.status,(d.proposed_start <= (${input.capturedAt}::timestamptz AT TIME ZONE 'Asia/Tehran')::date
        AND (d.proposed_end IS NULL OR d.proposed_end >= (${input.capturedAt}::timestamptz AT TIME ZONE 'Asia/Tehran')::date)
        AND d.activated_at <= ${input.capturedAt}::timestamptz AND ${input.capturedAt}::timestamptz <= now()) AS in_range,
      c.status AS collaboration_status,c.withdrawn_at
      FROM dena_provider_compensation_drafts d
      JOIN dena_provider_institute_collaborations c ON c.id=d.collaboration_id
      WHERE d.id=${input.contractId}::uuid FOR UPDATE OF c FOR SHARE OF d`);
    const contract=contracts[0] as {id:string;share_basis:keyof typeof compensationBasisLabels;share_basis_points:number;status:string;in_range:boolean;collaboration_status:string;withdrawn_at:unknown}|undefined;
    if(!contract) throw new Error("provider_contract_unavailable");
    const existing=await tx.execute(sql`SELECT id,event_key,source_id,contract_id,(captured_at=${input.capturedAt}::timestamptz) AS same_capture_time,gross_rials::text,gateway_fee_rials::text
      FROM dena_provider_revenue_allocations WHERE event_key=${input.eventKey} OR source_id=${input.sourceId}::uuid`);
    if(existing.length) {
      const row=existing[0] as {id:string;event_key:string;source_id:string;contract_id:string;same_capture_time:boolean;gross_rials:string;gateway_fee_rials:string};
      if(existing.length!==1||row.event_key!==input.eventKey||row.source_id!==input.sourceId||row.contract_id!==input.contractId||
        !row.same_capture_time||
        row.gross_rials!==String(input.grossRials)||row.gateway_fee_rials!==String(input.gatewayFeeRials)) throw new Error("provider_revenue_replay_conflict");
      return {id:row.id,duplicate:true};
    }
    if(contract.status!=="active"||!contract.in_range||contract.collaboration_status!=="approved"||contract.withdrawn_at) throw new Error("provider_contract_unavailable");
    const denaShareRials=input.grossRials/10;
    const split=calculateProviderCompensation({instituteShareBeforeFeeRials:input.grossRials-denaShareRials,
      gatewayFeeRials:input.gatewayFeeRials,shareBasis:contract.share_basis,shareBasisPoints:contract.share_basis_points});
    const capture=await postFinancialJournal(tx,{
      eventKey:`provider-capture:${input.eventKey}`,sourceId:input.sourceId,revenueStream:"supervised_provider",eventType:"payment_captured",
      entries:[
        {account:"gateway_clearing",side:"debit",amountRials:input.grossRials},
        {account:"dena_provider_commission_payable",side:"credit",amountRials:denaShareRials},
        ...(split.providerShareRials>0?[{account:"provider_compensation_payable" as const,side:"credit" as const,amountRials:split.providerShareRials}]:[]),
        ...(split.instituteNetRials+input.gatewayFeeRials>0?[{account:"institute_provider_payable" as const,side:"credit" as const,amountRials:split.instituteNetRials+input.gatewayFeeRials}]:[]),
      ],
    });
    const fee=input.gatewayFeeRials>0?await postFinancialJournal(tx,{
      eventKey:`provider-fee:${input.eventKey}`,sourceId:input.sourceId,revenueStream:"supervised_provider",eventType:"gateway_fee_recorded",
      entries:[{account:"institute_provider_payable",side:"debit",amountRials:input.gatewayFeeRials},
        {account:"gateway_clearing",side:"credit",amountRials:input.gatewayFeeRials}],
    }):null;
    const rows=await tx.execute(sql`INSERT INTO dena_provider_revenue_allocations
      (event_key,source_id,contract_id,captured_at,gross_rials,dena_share_rials,gateway_fee_rials,provider_share_rials,institute_net_rials,capture_journal_id,fee_journal_id)
      VALUES (${input.eventKey},${input.sourceId}::uuid,${input.contractId}::uuid,${input.capturedAt}::timestamptz,
        ${input.grossRials},${denaShareRials},${input.gatewayFeeRials},${split.providerShareRials},${split.instituteNetRials},${capture.id}::uuid,${fee?.id??null}::uuid)
      RETURNING id`);
    return {id:String(rows[0].id),duplicate:false};
  });
}
