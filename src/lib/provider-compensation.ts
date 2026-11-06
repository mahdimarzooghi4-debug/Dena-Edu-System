import { z } from "zod";
export const compensationBasisLabels = {
  institute_before_fee:"سهم مؤسسه پیش از کسر کارمزد درگاه",
  institute_after_fee:"سهم مؤسسه پس از کسر کارمزد درگاه",
} as const;
export const compensationDraftInput = z.object({
  collaborationId:z.uuid(), clientRequestId:z.uuid(), reference:z.string().trim().min(3).max(160),
  shareBasis:z.enum(["institute_before_fee","institute_after_fee"]),
  shareBasisPoints:z.number().int().min(0).max(10000),
  proposedStart:z.iso.date(), proposedEnd:z.iso.date().nullable(),
  settlementTerms:z.string().trim().min(15).max(1500),
}).strict().refine((data)=>!data.proposedEnd || data.proposedEnd>=data.proposedStart,{path:["proposedEnd"],message:"invalid_date_range"});
export type CompensationDraftRow = {
  id:string; collaboration_id:string; provider_name:string; institute_name:string;
  reference:string; share_basis:keyof typeof compensationBasisLabels; share_basis_points:number;
  proposed_start:string; proposed_end:string|null; settlement_terms:string; status:"draft"; created_at:Date|string;
};
