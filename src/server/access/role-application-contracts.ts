import { z } from "zod";

/** No client may request the platform admin role or choose its own tenant ID. */
export const requestedElevatedRole = z.enum([
  "institute", "provider", "organization", "benefactor",
]);

export const newRoleApplication = z.object({
  role: requestedElevatedRole,
  proposedName: z.string().trim().min(3).max(120),
  statement: z.string().trim().min(20).max(500),
}).strict();

const reason = z.string().trim().min(15).max(500);
export const roleApplicationDecision = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    verifiedName: z.string().trim().min(3).max(120),
    evidenceReference: z.string().trim().min(8).max(200),
    reason,
  }).strict(),
  z.object({
    action: z.literal("reject"),
    reason,
  }).strict(),
]);

export type RoleApplicationDecision = z.infer<typeof roleApplicationDecision>;

export function validSameOrigin(origin: string | null): boolean {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl || !origin) return false;
  try {
    return origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}
