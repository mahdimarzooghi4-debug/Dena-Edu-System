import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { auditLogs, instituteServiceCatalog, memberships, verifiedEntities } from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import { getInstituteScopes } from "./scopes";

const safeText = (min: number, max: number) => z.string().trim().min(min).max(max)
  .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value));
const serviceFields = {
  title: safeText(3, 120),
  category: z.enum(["consultation", "career_guidance", "assessment", "support", "other"]),
  description: safeText(10, 2000),
  priceToman: z.number().int().min(1).max(1_000_000_000_000),
  includedMinutes: z.number().int().min(5).max(100_000).nullable(),
  validityDays: z.number().int().min(1).max(3650).nullable(),
  guardianConsentRequired: z.boolean(),
  cancellationPolicy: safeText(1, 1500),
};
export const instituteServiceCreateInput = z.object({ instituteId: z.uuid(), ...serviceFields }).strict().superRefine(
  validateQuota,
);
export const instituteServiceUpdateInput = z.object({
  ...serviceFields,
  status: z.enum(["draft", "active", "paused"]),
}).strict().superRefine(validateQuota);
function validateQuota(input: { includedMinutes: number | null; validityDays: number | null }, ctx: z.RefinementCtx) {
  if ((input.includedMinutes === null) !== (input.validityDays === null)) {
    ctx.addIssue({ code: "custom", path: ["validityDays"], message: "quota_fields_must_match" });
  }
}

export type InstituteServiceCreateInput = z.infer<typeof instituteServiceCreateInput>;
export type InstituteServiceUpdateInput = z.infer<typeof instituteServiceUpdateInput>;

/** Toman prices convert to whole rial amounts; the approved Dena share is 10%
 * of gross service revenue. Gateway fees are deducted later from the institute. */
export function calculateInstituteServiceGrossSplit(priceToman: number) {
  if (!Number.isSafeInteger(priceToman) || priceToman < 1 || priceToman > 1_000_000_000_000) {
    throw new RangeError("invalid_service_price");
  }
  const grossRials = priceToman * 10;
  const denaShareRials = grossRials / 10;
  return {
    grossRials,
    denaShareRials,
    instituteShareBeforeGatewayFeeRials: grossRials - denaShareRials,
  };
}

export class InstituteServiceError extends Error {
  constructor(readonly kind: "scope_unavailable" | "service_unavailable") { super(kind); }
}

export async function getInstituteServices(userId: string) {
  const scopes = await getInstituteScopes(userId);
  if (!scopes.length) return { services: [], institutes: [] };
  const rows = await getDb().select({
    id: instituteServiceCatalog.id,
    instituteId: instituteServiceCatalog.instituteId,
    instituteName: verifiedEntities.name,
    title: instituteServiceCatalog.title,
    category: instituteServiceCatalog.category,
    description: instituteServiceCatalog.description,
    priceToman: instituteServiceCatalog.priceToman,
    includedMinutes: instituteServiceCatalog.includedMinutes,
    validityDays: instituteServiceCatalog.validityDays,
    guardianConsentRequired: instituteServiceCatalog.guardianConsentRequired,
    cancellationPolicy: instituteServiceCatalog.cancellationPolicy,
    status: instituteServiceCatalog.status,
    createdAt: instituteServiceCatalog.createdAt,
    updatedAt: instituteServiceCatalog.updatedAt,
  }).from(instituteServiceCatalog).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, instituteServiceCatalog.instituteId),
    eq(verifiedEntities.role, "institute"),
  )).where(inArray(instituteServiceCatalog.instituteId, scopes.map((scope) => scope.id)))
    .orderBy(desc(instituteServiceCatalog.updatedAt), desc(instituteServiceCatalog.id)).limit(200);
  return { services: rows, institutes: scopes };
}

/** Public student-facing metadata for explicitly active services. Internal
 * creator IDs and institute account details are intentionally not returned. */
export async function getStudentServiceCatalog() {
  const rows = await getDb().select({
    id: instituteServiceCatalog.id,
    instituteName: verifiedEntities.name,
    title: instituteServiceCatalog.title,
    category: instituteServiceCatalog.category,
    description: instituteServiceCatalog.description,
    priceToman: instituteServiceCatalog.priceToman,
    includedMinutes: instituteServiceCatalog.includedMinutes,
    validityDays: instituteServiceCatalog.validityDays,
    guardianConsentRequired: instituteServiceCatalog.guardianConsentRequired,
    cancellationPolicy: instituteServiceCatalog.cancellationPolicy,
  }).from(instituteServiceCatalog).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, instituteServiceCatalog.instituteId),
    eq(verifiedEntities.role, "institute"),
  )).where(eq(instituteServiceCatalog.status, "active"))
    .orderBy(verifiedEntities.name, instituteServiceCatalog.title).limit(100);
  return { services: rows };
}

export async function getInstituteServiceById(userId: string, serviceId: string) {
  const scopes = await getInstituteScopes(userId);
  if (!scopes.length) return null;
  const [service] = await getDb().select({
    id: instituteServiceCatalog.id,
    instituteId: instituteServiceCatalog.instituteId,
    instituteName: verifiedEntities.name,
    title: instituteServiceCatalog.title,
    category: instituteServiceCatalog.category,
    description: instituteServiceCatalog.description,
    priceToman: instituteServiceCatalog.priceToman,
    includedMinutes: instituteServiceCatalog.includedMinutes,
    validityDays: instituteServiceCatalog.validityDays,
    guardianConsentRequired: instituteServiceCatalog.guardianConsentRequired,
    cancellationPolicy: instituteServiceCatalog.cancellationPolicy,
    status: instituteServiceCatalog.status,
  }).from(instituteServiceCatalog).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, instituteServiceCatalog.instituteId),
    eq(verifiedEntities.role, "institute"),
  )).where(and(
    eq(instituteServiceCatalog.id, serviceId),
    inArray(instituteServiceCatalog.instituteId, scopes.map((scope) => scope.id)),
  )).limit(1);
  return service ?? null;
}

export async function createInstituteService(userId: string, input: InstituteServiceCreateInput) {
  return getDb().transaction(async (tx) => {
    const scopes = await tx.select({ id: verifiedEntities.id })
      .from(memberships).innerJoin(verifiedEntities, and(
        eq(memberships.instituteId, verifiedEntities.id),
        eq(verifiedEntities.role, "institute"),
      )).where(and(
        eq(memberships.userId, userId), eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).for("share");
    const instituteIds = [...new Set(scopes.map((scope) => scope.id))];
    if (!instituteIds.length) throw new InstituteServiceError("scope_unavailable");
    if (!instituteIds.includes(input.instituteId)) throw new InstituteServiceError("scope_unavailable");
    const [row] = await tx.insert(instituteServiceCatalog).values({
      ...input, createdByUserId: userId,
    }).returning({ id: instituteServiceCatalog.id });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "institute", action: "institute.service.created",
      entityType: "INSTITUTE_SERVICE", entityId: row!.id,
    }));
    return row!;
  });
}

export async function updateInstituteService(
  userId: string, serviceId: string, input: InstituteServiceUpdateInput,
) {
  return getDb().transaction(async (tx) => {
    const scopes = await tx.select({ id: verifiedEntities.id })
      .from(memberships).innerJoin(verifiedEntities, and(
        eq(memberships.instituteId, verifiedEntities.id),
        eq(verifiedEntities.role, "institute"),
      )).where(and(
        eq(memberships.userId, userId), eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).for("share");
    const instituteIds = [...new Set(scopes.map((scope) => scope.id))];
    if (!instituteIds.length) throw new InstituteServiceError("scope_unavailable");
    const [existing] = await tx.select({ id: instituteServiceCatalog.id })
      .from(instituteServiceCatalog).where(and(
        eq(instituteServiceCatalog.id, serviceId),
        inArray(instituteServiceCatalog.instituteId, instituteIds),
      )).limit(1).for("update");
    if (!existing) throw new InstituteServiceError("service_unavailable");
    const [updated] = await tx.update(instituteServiceCatalog).set({
      ...input, updatedAt: new Date(),
    }).where(eq(instituteServiceCatalog.id, existing.id))
      .returning({ id: instituteServiceCatalog.id, status: instituteServiceCatalog.status });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "institute", action: "institute.service.updated",
      entityType: "INSTITUTE_SERVICE", entityId: existing.id,
    }));
    return updated!;
  });
}
