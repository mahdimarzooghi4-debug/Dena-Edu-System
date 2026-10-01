import { desc, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { instituteServiceOrders } from "../../db/schema";
import { getInstituteScopes } from "./scopes";

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
    status: instituteServiceOrders.status,
    createdAt: instituteServiceOrders.createdAt,
  }).from(instituteServiceOrders)
    .where(inArray(instituteServiceOrders.instituteId, scopes.map((scope) => scope.id)))
    .orderBy(desc(instituteServiceOrders.createdAt), desc(instituteServiceOrders.id)).limit(200);
  return { institutes: scopes, orders };
}
