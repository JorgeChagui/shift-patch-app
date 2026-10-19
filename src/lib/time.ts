// Shift times are facility-local strings ("YYYY-MM-DD", "HH:mm"); no timezone conversion.
// If endTime <= startTime the shift ends the next day (cross-phase decision 11).

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isOvernight(startTime: string, endTime: string): boolean {
  return toMinutes(endTime) <= toMinutes(startTime);
}

/** Length of a shift in hours, e.g. 19:00 → 07:00 is 12. */
export function shiftHours(startTime: string, endTime: string): number {
  let minutes = toMinutes(endTime) - toMinutes(startTime);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

/** Adds days to a "YYYY-MM-DD" date using UTC calendar maths. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** When a shift ends, as { date, time }, both facility-local. */
export function shiftEnd(
  date: string,
  startTime: string,
  endTime: string,
): { date: string; time: string } {
  return {
    date: isOvernight(startTime, endTime) ? addDays(date, 1) : date,
    time: endTime,
  };
}
