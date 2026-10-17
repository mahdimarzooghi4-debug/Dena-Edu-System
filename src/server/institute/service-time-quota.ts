import { inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { serviceTimeLedger } from "../../db/schema";

type QuotaOrder = { id: string; includedMinutes: number | null };

/** Returns only recorded grant/consumption totals. It never guesses call duration. */
export async function addRecordedServiceTimeBalances<T extends QuotaOrder>(orders: T[]) {
  if (!orders.length) return orders.map((order) => ({
    ...order, consumedMinutes: 0, remainingMinutes: 0,
  }));
  const events = await getDb().select({
    serviceOrderId: serviceTimeLedger.serviceOrderId,
    eventType: serviceTimeLedger.eventType,
    minutes: serviceTimeLedger.minutes,
  }).from(serviceTimeLedger).where(inArray(
    serviceTimeLedger.serviceOrderId, orders.map((order) => order.id),
  ));
  const totals = new Map<string, { granted: number; consumed: number }>();
  for (const event of events) {
    const total = totals.get(event.serviceOrderId) ?? { granted: 0, consumed: 0 };
    if (event.eventType === "grant") total.granted += event.minutes;
    else total.consumed += event.minutes;
    totals.set(event.serviceOrderId, total);
  }
  return orders.map((order) => {
    const total = totals.get(order.id) ?? { granted: 0, consumed: 0 };
    return {
      ...order,
      consumedMinutes: total.consumed,
      remainingMinutes: Math.max(0, total.granted - total.consumed),
    };
  });
}
