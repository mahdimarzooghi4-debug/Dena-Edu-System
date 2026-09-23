import { z } from "zod";

/** Client may select only scopes already approved on the server. IDs are never
 * authoritative until rechecked against persisted active memberships/entities.
 */
export const newSupervisedCourse = z.object({
  providerId: z.uuid(),
  responsibleInstituteId: z.uuid(),
  clientRequestId: z.uuid(),
  title: z.string().trim().min(5).max(160),
}).strict();

export const supervisionDecision = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    reason: z.string().trim().min(15).max(500),
  }).strict(),
  z.object({
    action: z.literal("revoke"),
    reason: z.string().trim().min(15).max(500),
  }).strict(),
]);

export type NewSupervisedCourse = z.infer<typeof newSupervisedCourse>;
export type SupervisionDecision = z.infer<typeof supervisionDecision>;
