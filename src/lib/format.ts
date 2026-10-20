import type { ShiftStatus } from "@/generated/prisma/enums";
import { isOvernight } from "@/lib/time";

// Display helpers. Dates are facility-local "YYYY-MM-DD" strings, so they're formatted in UTC
// with a fixed locale: server and client render the same text (no hydration mismatch).

const shiftDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timestamp = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** "2026-10-02" → "Fri 2 Oct 2026". */
export function formatShiftDate(date: string): string {
  return shiftDate.format(new Date(`${date}T00:00:00Z`)).replace(",", "");
}

/** "19:00", "07:00" → "19:00 – 07:00". Overnight is marked separately (see ShiftTimes). */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`;
}

/** A spoken version for screen readers: "19:00 to 07:00 the next day". */
export function describeTimeRange(startTime: string, endTime: string): string {
  return `${startTime} to ${endTime}${isOvernight(startTime, endTime) ? " the next day" : ""}`;
}

/** ISO timestamp → "19 Oct, 14:05" (UTC). */
export function formatTimestamp(iso: string): string {
  return timestamp.format(new Date(iso));
}

export function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

export const STATUS_LABEL: Record<ShiftStatus, string> = {
  open: "open",
  filled: "filled",
  cancelled: "cancelled",
};

/** Tailwind classes per shift status: the badge, and the bar in ShiftTimeStrip. */
export const STATUS_TONE: Record<ShiftStatus, { badge: string; bar: string }> = {
  open: { badge: "bg-status-open-wash text-brand-ink ring-status-open/30", bar: "bg-status-open" },
  filled: { badge: "bg-status-filled-wash text-mint-ink ring-status-filled/30", bar: "bg-status-filled" },
  cancelled: {
    badge: "bg-status-cancelled-wash text-ink-muted ring-status-cancelled/30",
    bar: "bg-status-cancelled",
  },
};

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Signed out",
  "shift.created": "Posted shift",
  "shift.claimed": "Claimed shift",
  "shift.claim_blocked": "Claim blocked",
  "shift.cancelled": "Cancelled shift",
  "shift.withdrawn": "Withdrew shift",
  "credential.uploaded": "Uploaded credential",
  "timesheet.approved": "Approved timesheet",
  "notification.read": "Read notification",
};

export function formatAuditAction(action: string): string {
  // Own keys only: a stored action like "constructor" must not resolve to Object.prototype.
  return Object.hasOwn(ACTION_LABEL, action) ? ACTION_LABEL[action] : action;
}

/** Audit metadata as "key: value" pairs for the details column. */
export function formatMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  return Object.entries(metadata as Record<string, unknown>)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(", ");
}
