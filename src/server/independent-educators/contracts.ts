import { z } from "zod";

const safeText = (min: number, max: number) => z.string().trim().min(min).max(max)
  .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value));

export const createEducatorAffiliationInput = z.object({
  instituteId: z.uuid(),
  clientRequestId: z.uuid(),
  displayName: safeText(3, 120),
  statement: safeText(20, 500),
}).strict();

export const educatorAffiliationDecisionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), reason: safeText(15, 500) }).strict(),
  z.object({ action: z.literal("reject"), reason: safeText(15, 500) }).strict(),
  z.object({ action: z.literal("revoke"), reason: safeText(15, 500) }).strict(),
]);

export const educatorAffiliationStatus = z.enum([
  "requested", "approved", "rejected", "withdrawn", "revoked",
]);

export type CreateEducatorAffiliationInput = z.infer<typeof createEducatorAffiliationInput>;
export type EducatorAffiliationDecision = z.infer<typeof educatorAffiliationDecisionInput>;
export type EducatorAffiliationStatus = z.infer<typeof educatorAffiliationStatus>;
