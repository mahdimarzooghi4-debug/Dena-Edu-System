/** Formats an exact whole-second duration without rounding it to minutes. */
export function formatServiceDuration(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.trunc(seconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  const number = (value: number) => value.toLocaleString("fa-IR");
  if (hours > 0) return `${number(hours)} ساعت و ${number(minutes)} دقیقه و ${number(remainder)} ثانیه`;
  if (minutes > 0) return `${number(minutes)} دقیقه و ${number(remainder)} ثانیه`;
  return `${number(remainder)} ثانیه`;
}
