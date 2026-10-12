/** Pure scheduling helpers for the campaign wizard. */

/** Parses MM/DD/YYYY plus h:mm and AM/PM into a local Date, or null when invalid. */
export function parseCustomDateTime(
  date: string,
  time: string,
  meridiem: "AM" | "PM",
): Date | null {
  const dateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;
  const month = Number(dateMatch[1]);
  const day = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  )
    return null;
  return result;
}

/** Tomorrow at 10:00 AM local time, the wizard's one-tap schedule option. */
export function tomorrowMorning(now = new Date()): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

/** True when a scheduled campaign's time has already passed without sending. */
export function isPastDue(
  campaign: { status: string; scheduledAt?: string },
  now = Date.now(),
): boolean {
  return (
    campaign.status === "scheduled" &&
    typeof campaign.scheduledAt === "string" &&
    Date.parse(campaign.scheduledAt) <= now
  );
}

/** True once an ISO timestamp is at or before now. */
export function hasPassed(iso: string, now = Date.now()): boolean {
  return Date.parse(iso) <= now;
}
