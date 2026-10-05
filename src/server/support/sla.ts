export type SupportPriority = "low" | "normal" | "high" | "urgent";

export const SUPPORT_SLA_MINUTES: Record<SupportPriority, {
  firstResponse: number;
  resolution: number;
}> = {
  urgent: { firstResponse: 120, resolution: 480 },
  high: { firstResponse: 480, resolution: 960 },
  normal: { firstResponse: 480, resolution: 1440 },
  low: { firstResponse: 960, resolution: 2400 },
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function isIranWorkMinute(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date)
    .map(({ type, value }) => [type, value]));
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  // Saturday through Thursday, 09:00–17:00 Tehran; official holidays are
  // intentionally not excluded until an authoritative holiday calendar exists.
  return parts.weekday !== "Fri" && minuteOfDay >= 540 && minuteOfDay < 1020;
}

export function addIranBusinessMinutes(from: Date, minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0) throw new RangeError("Invalid business minutes");
  const cursor = new Date(from);
  let remaining = minutes;
  let guard = 0;
  while (remaining > 0) {
    if (isIranWorkMinute(cursor)) remaining -= 1;
    cursor.setTime(cursor.getTime() + 60_000);
    guard += 1;
    if (guard > 60 * 24 * 366) throw new RangeError("Business deadline is too far away");
  }
  return cursor;
}

export function iranBusinessMinutesBetween(from: Date, to: Date) {
  if (to <= from) return 0;
  let cursor = new Date(from);
  let total = 0;
  let guard = 0;
  while (cursor.getTime() + 60_000 <= to.getTime()) {
    if (isIranWorkMinute(cursor)) total += 1;
    cursor = new Date(cursor.getTime() + 60_000);
    guard += 1;
    if (guard > 60 * 24 * 366) throw new RangeError("Business interval is too large");
  }
  return total;
}
