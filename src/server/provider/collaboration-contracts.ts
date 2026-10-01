import { z } from "zod";

const reviewReason = z.string().trim().min(15).max(500)
  .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value));

export const createProviderCollaborationInput = z.object({
  providerId: z.uuid(),
  instituteId: z.uuid(),
  clientRequestId: z.uuid(),
}).strict();

export const collaborationDecisionInput = z.object({
  action: z.enum(["approve", "reject"]),
  reason: reviewReason,
}).strict();

export type CollaborationDecision = z.infer<typeof collaborationDecisionInput>;
