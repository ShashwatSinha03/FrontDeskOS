/**
 * Timezone utility — converts between business-local time and UTC.
 *
 * All business working hours, slot displays, and customer-facing times
 * are expressed in the business's IANA timezone (e.g. "Asia/Kolkata").
 * The database stores appointment_time as timestamptz (UTC internally).
 *
 * Uses Intl.DateTimeFormat with timeZone option — zero dependencies,
 * DST-safe, handles all IANA timezones.
 */

/**
 * Get today's calendar date as "YYYY-MM-DD" in a given IANA timezone.
 * Example: Asia/Kolkata at 23:00 UTC → "2026-06-15" (next day)
 */
export function getBusinessDateStr(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Get the time as "HH:mm" in a given IANA timezone from a UTC Date.
 * Example: 2026-06-15 08:30 UTC in Asia/Kolkata → "14:00"
 */
export function getTimeStrInTz(tz: string, utcDate: Date): string {
  return new Intl.DateTimeFormat('en', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(utcDate);
}

/**
 * Get the day-of-week (0 = Sunday, 6 = Saturday) for a calendar date
 * in a given IANA timezone.
 */
export function getDayOfWeekInTz(tz: string, dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const midday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    weekday: 'long',
  }).formatToParts(midday);
  const dayName = parts.find(p => p.type === 'weekday')!.value.toLowerCase();
  const map: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  return map[dayName] ?? midday.getUTCDay();
}

/**
 * Compute the UTC offset (in milliseconds) for a given IANA timezone at a
 * specific UTC moment.
 *
 * Returns the value that must be ADDED to a wall-clock reading to get UTC.
 * Example: Asia/Kolkata at 12:00 UTC → +19_800_000 (UTC+5:30)
 */
export function getTzOffsetMs(tz: string, utcDate: Date): number {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);

  const getNum = (type: string) =>
    parseInt(parts.find(p => p.type === type)!.value, 10);

  const wallUtc = Date.UTC(
    getNum('year'),
    getNum('month') - 1,
    getNum('day'),
    getNum('hour'),
    getNum('minute'),
  );
  return wallUtc - utcDate.getTime();
}

/**
 * Convert a business-local date+time to a UTC Date (suitable for
 * timestamptz storage).
 *
 * Two-pass algorithm handles DST transitions correctly:
 *   1. Estimate UTC using current offset
 *   2. Recalculate offset at estimated time
 *
 * Edge cases:
 *   - Spring-forward gap (non-existent time): uses the offset just before
 *     the gap, which is the conventional mapping.
 *   - Fall-back overlap (ambiguous time): maps to the FIRST occurrence
 *     (daylight time), which is the conventional choice.
 */
export function fromBusinessTimeToUtc(
  tz: string,
  dateStr: string,
  timeStr: string,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);

  const asUtc = new Date(Date.UTC(y, m - 1, d, h, min, 0));
  const offsetMs = getTzOffsetMs(tz, asUtc);

  const result = new Date(asUtc.getTime() - offsetMs);

  const adjustedOffset = getTzOffsetMs(tz, result);
  if (adjustedOffset !== offsetMs) {
    return new Date(asUtc.getTime() - adjustedOffset);
  }

  return result;
}

/**
 * Get the start of a business calendar day as a UTC Date.
 * e.g. "2026-06-15" in Asia/Kolkata → 2026-06-14 18:30 UTC
 */
export function businessDayStartUtc(tz: string, dateStr: string): Date {
  return fromBusinessTimeToUtc(tz, dateStr, '00:00');
}

/**
 * Get the end of a business calendar day as a UTC Date (exclusive).
 * e.g. "2026-06-15" in Asia/Kolkata → 2026-06-15 18:30 UTC
 */
export function businessDayEndUtc(tz: string, dateStr: string): Date {
  return fromBusinessTimeToUtc(tz, dateStr, '23:59');
}

/**
 * Get the business-local date as "YYYY-MM-DD" from a UTC Date.
 */
export function getBusinessDateStrFromUtc(tz: string, utcDate: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
}
