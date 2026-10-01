import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { auditLogs, instituteServiceOrders, memberships, verifiedEntities } from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import { getInstituteScopes } from "./scopes";

export class InstituteServiceOrderError extends Error {
  constructor(readonly kind: "reviewer_unavailable" | "order_unavailable" | "consent_not_required") {
    super(kind);
  }
}

/** Institute-facing order inbox. It deliberately excludes student identity and
 * only returns immutable order snapshots for institutes the actor belongs to. */
export async function getInstituteServiceOrders(userId: string) {
  const scopes = await getInstituteScopes(userId);
  if (!scopes.length) return { institutes: [], orders: [] };
  const orders = await getDb().select({
    id: instituteServiceOrders.id,
    title: instituteServiceOrders.serviceTitleSnapshot,
    priceToman: instituteServiceOrders.priceToman,
    includedMinutes: instituteServiceOrders.includedMinutes,
    validityDays: instituteServiceOrders.validityDays,
    guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
    guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
    status: instituteServiceOrders.status,
    createdAt: instituteServiceOrders.createdAt,
  }).from(instituteServiceOrders)
    .where(inArray(instituteServiceOrders.instituteId, scopes.map((scope) => scope.id)))
    .orderBy(desc(instituteServiceOrders.createdAt), desc(instituteServiceOrders.id)).limit(200);
  return { institutes: scopes, orders };
}

/** Records the institute's attestation that consent was obtained for this
 * specific service order. It never marks payment as captured. */
export async function confirmInstituteServiceOrderGuardianConsent(
  userId: string, orderId: string,
) {
  return getDb().transaction(async (tx) => {
    const scopes = await tx.select({ instituteId: memberships.instituteId })
      .from(memberships).innerJoin(verifiedEntities, and(
        eq(verifiedEntities.id, memberships.instituteId),
        eq(verifiedEntities.role, "institute"),
      )).where(and(
        eq(memberships.userId, userId),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      ));
    const instituteIds = scopes.flatMap((scope) => scope.instituteId ? [scope.instituteId] : []);
    if (!instituteIds.length) throw new InstituteServiceOrderError("reviewer_unavailable");

    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      instituteId: instituteServiceOrders.instituteId,
      guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
      guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
      guardianConsentConfirmedByUserId: instituteServiceOrders.guardianConsentConfirmedByUserId,
      status: instituteServiceOrders.status,
    }).from(instituteServiceOrders).where(and(
      eq(instituteServiceOrders.id, orderId),
      inArray(instituteServiceOrders.instituteId, instituteIds),
    )).limit(1).for("update");
    if (!order) throw new InstituteServiceOrderError("order_unavailable");
    if (!order.guardianConsentRequired) {
      throw new InstituteServiceOrderError("consent_not_required");
    }
    if (order.guardianConsentConfirmedAt && order.guardianConsentConfirmedByUserId) {
      return { id: order.id, status: order.status, duplicate: true };
    }
    if (order.status !== "awaiting_guardian_consent") {
      throw new InstituteServiceOrderError("order_unavailable");
    }

    const confirmedAt = new Date();
    await tx.update(instituteServiceOrders).set({
      guardianConsentConfirmedAt: confirmedAt,
      guardianConsentConfirmedByUserId: userId,
      status: "awaiting_payment",
      updatedAt: confirmedAt,
    }).where(eq(instituteServiceOrders.id, order.id));
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId,
      actorRole: "institute",
      action: "institute.service_order.guardian_consent_confirmed",
      entityType: "SERVICE_ORDER",
      entityId: order.id,
    }));
    return { id: order.id, status: "awaiting_payment" as const, duplicate: false };
  });
}
