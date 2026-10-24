import { and, count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "../../db";
import { instituteServiceOrders, verifiedEntities } from "../../db/schema";

export const adminServiceOrderStatuses = [
  "awaiting_guardian_consent", "awaiting_payment", "paid", "cancelled",
] as const;
export type AdminServiceOrderStatus = typeof adminServiceOrderStatuses[number];

export async function getAdminServiceAccountingOverview(status?: AdminServiceOrderStatus) {
  const db = getDb();
  const [statusRows, paidTotals, orders] = await Promise.all([
    db.select({ status: instituteServiceOrders.status, total: count() })
      .from(instituteServiceOrders).groupBy(instituteServiceOrders.status),
    db.select({
      grossRials: sum(instituteServiceOrders.grossRials),
      denaShareRials: sum(instituteServiceOrders.denaShareRials),
      instituteShareRials: sum(instituteServiceOrders.instituteShareRials),
    }).from(instituteServiceOrders).where(eq(instituteServiceOrders.status, "paid")),
    db.select({
      id: instituteServiceOrders.id,
      title: instituteServiceOrders.serviceTitleSnapshot,
      category: instituteServiceOrders.categorySnapshot,
      instituteName: verifiedEntities.name,
      priceToman: instituteServiceOrders.priceToman,
      grossRials: instituteServiceOrders.grossRials,
      denaShareRials: instituteServiceOrders.denaShareRials,
      instituteShareRials: instituteServiceOrders.instituteShareRials,
      status: instituteServiceOrders.status,
      createdAt: instituteServiceOrders.createdAt,
      paidAt: instituteServiceOrders.paidAt,
    }).from(instituteServiceOrders).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, instituteServiceOrders.instituteId),
      eq(verifiedEntities.role, "institute"),
    )).where(status ? eq(instituteServiceOrders.status, status) : undefined)
      .orderBy(desc(instituteServiceOrders.createdAt), desc(instituteServiceOrders.id)).limit(100),
  ]);

  const totals = Object.fromEntries(adminServiceOrderStatuses.map((key) => [
    key, statusRows.find((row) => row.status === key)?.total ?? 0,
  ])) as Record<AdminServiceOrderStatus, number>;
  const paid = paidTotals[0];
  const toman = (rials: string | null | undefined) => Math.floor(Number(rials ?? 0) / 10);

  return {
    totals,
    orderCount: Object.values(totals).reduce((total, value) => total + value, 0),
    paidAccounting: {
      grossToman: toman(paid?.grossRials),
      denaShareToman: toman(paid?.denaShareRials),
      instituteShareToman: toman(paid?.instituteShareRials),
    },
    orders,
  };
}
