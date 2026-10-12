import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  auditLogs, instituteServiceCatalog, instituteServiceOrders, memberships, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import { calculateInstituteServiceGrossSplit } from "../institute/services";

export const createServiceOrderInput = z.object({
  serviceId: z.uuid(),
  idempotencyKey: z.uuid(),
}).strict();

export class StudentServiceOrderError extends Error {
  constructor(readonly kind:
    "student_unavailable" | "service_unavailable" | "order_unavailable" |
    "order_pending_exists" | "idempotency_conflict") { super(kind); }
}

export async function getStudentServiceOrders(studentUserId: string) {
  const db = getDb();
  const [activeStudent] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, studentUserId), eq(memberships.role, "student"),
      eq(memberships.status, "active"))).limit(1);
  if (!activeStudent) return [];
  return db.select({
    id: instituteServiceOrders.id,
    serviceId: instituteServiceOrders.serviceId,
    instituteName: verifiedEntities.name,
    title: instituteServiceOrders.serviceTitleSnapshot,
    priceToman: instituteServiceOrders.priceToman,
    includedMinutes: instituteServiceOrders.includedMinutes,
    validityDays: instituteServiceOrders.validityDays,
    status: instituteServiceOrders.status,
    guardianConsentRequired: instituteServiceOrders.guardianConsentRequired,
    guardianConsentConfirmedAt: instituteServiceOrders.guardianConsentConfirmedAt,
    createdAt: instituteServiceOrders.createdAt,
  }).from(instituteServiceOrders).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, instituteServiceOrders.instituteId),
    eq(verifiedEntities.role, "institute"),
  )).where(eq(instituteServiceOrders.studentUserId, studentUserId))
    .orderBy(desc(instituteServiceOrders.createdAt), desc(instituteServiceOrders.id)).limit(100);
}

export async function createStudentServiceOrder(
  studentUserId: string, input: z.infer<typeof createServiceOrderInput>,
) {
  const parsed = createServiceOrderInput.parse(input);
  return getDb().transaction(async (tx) => {
    const [activeStudent] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, studentUserId), eq(memberships.role, "student"),
        eq(memberships.status, "active"))).limit(1).for("share");
    if (!activeStudent) throw new StudentServiceOrderError("student_unavailable");

    const [existingByKey] = await tx.select({ id: instituteServiceOrders.id,
      serviceId: instituteServiceOrders.serviceId, status: instituteServiceOrders.status,
    }).from(instituteServiceOrders).where(and(
      eq(instituteServiceOrders.studentUserId, studentUserId),
      eq(instituteServiceOrders.idempotencyKey, parsed.idempotencyKey),
    )).limit(1).for("update");
    if (existingByKey) {
      if (existingByKey.serviceId !== parsed.serviceId) throw new StudentServiceOrderError("idempotency_conflict");
      return { id: existingByKey.id, status: existingByKey.status, duplicate: true };
    }

    const [service] = await tx.select({
      id: instituteServiceCatalog.id,
      instituteId: instituteServiceCatalog.instituteId,
      title: instituteServiceCatalog.title,
      category: instituteServiceCatalog.category,
      priceToman: instituteServiceCatalog.priceToman,
      includedMinutes: instituteServiceCatalog.includedMinutes,
      validityDays: instituteServiceCatalog.validityDays,
      guardianConsentRequired: instituteServiceCatalog.guardianConsentRequired,
    }).from(instituteServiceCatalog).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, instituteServiceCatalog.instituteId),
      eq(verifiedEntities.role, "institute"),
    )).where(and(
      eq(instituteServiceCatalog.id, parsed.serviceId),
      eq(instituteServiceCatalog.status, "active"),
    )).limit(1).for("update");
    if (!service) throw new StudentServiceOrderError("service_unavailable");

    const [pendingOrder] = await tx.select({ id: instituteServiceOrders.id })
      .from(instituteServiceOrders).where(and(
        eq(instituteServiceOrders.studentUserId, studentUserId),
        eq(instituteServiceOrders.serviceId, service.id),
        inArray(instituteServiceOrders.status, ["awaiting_guardian_consent", "awaiting_payment"]),
      )).limit(1).for("update");
    if (pendingOrder) throw new StudentServiceOrderError("order_pending_exists");

    const split = calculateInstituteServiceGrossSplit(service.priceToman);
    const status = service.guardianConsentRequired
      ? "awaiting_guardian_consent" as const
      : "awaiting_payment" as const;
    const [order] = await tx.insert(instituteServiceOrders).values({
      idempotencyKey: parsed.idempotencyKey,
      studentUserId,
      serviceId: service.id,
      instituteId: service.instituteId,
      serviceTitleSnapshot: service.title,
      categorySnapshot: service.category,
      priceToman: service.priceToman,
      grossRials: split.grossRials,
      denaShareRials: split.denaShareRials,
      instituteShareRials: split.instituteShareBeforeGatewayFeeRials,
      includedMinutes: service.includedMinutes,
      validityDays: service.validityDays,
      guardianConsentRequired: service.guardianConsentRequired,
      status,
    }).returning({ id: instituteServiceOrders.id, status: instituteServiceOrders.status });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: studentUserId, actorRole: "student", action: "student.service_order.created",
      entityType: "SERVICE_ORDER", entityId: order!.id,
    }));
    return { ...order!, duplicate: false };
  });
}

export async function cancelStudentServiceOrder(studentUserId: string, orderId: string) {
  return getDb().transaction(async (tx) => {
    const [activeStudent] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, studentUserId), eq(memberships.role, "student"),
        eq(memberships.status, "active"))).limit(1).for("share");
    if (!activeStudent) throw new StudentServiceOrderError("student_unavailable");
    const [order] = await tx.select({
      id: instituteServiceOrders.id,
      status: instituteServiceOrders.status,
    }).from(instituteServiceOrders).where(and(
      eq(instituteServiceOrders.id, orderId),
      eq(instituteServiceOrders.studentUserId, studentUserId),
    )).limit(1).for("update");
    if (!order) throw new StudentServiceOrderError("order_unavailable");
    if (order.status === "cancelled") return { id: order.id, status: order.status, duplicate: true };
    if (order.status !== "awaiting_guardian_consent" && order.status !== "awaiting_payment") {
      throw new StudentServiceOrderError("order_unavailable");
    }
    await tx.update(instituteServiceOrders).set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(instituteServiceOrders.id, order.id));
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: studentUserId, actorRole: "student", action: "student.service_order.cancelled",
      entityType: "SERVICE_ORDER", entityId: order.id,
    }));
    return { id: order.id, status: "cancelled" as const, duplicate: false };
  });
}
