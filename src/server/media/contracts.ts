import { z } from "zod";

export const reserveIngest = z.object({
  requestId: z.uuid(),
  title: z.string().trim().min(3).max(160),
  expectedBytes: z.number().int().min(16).max(8 * 1024 * 1024),
  expectedSha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export const workerDecision = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete") }).strict(),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(10).max(500),
  }).strict(),
]);
