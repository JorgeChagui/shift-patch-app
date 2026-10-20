import { revalidateTag } from "next/cache";

// Cache tags for the 'use cache' reads in src/lib/data. Every mutation expires the tags it touches:
// Server Actions with updateTag (read-your-own-writes), route handlers with expireTags below.

export const TAGS = {
  shifts: "shifts",
  timesheets: "timesheets",
  auditLog: "audit-log",
  credentials: (nurseId: string) => `credentials:${nurseId}`,
} as const;

/** Tags each mutation invalidates. Every mutation writes an audit row, so auditLog is always in. */
export const MUTATION_TAGS = {
  login: () => [TAGS.auditLog],
  createShift: () => [TAGS.shifts, TAGS.auditLog],
  claimShift: () => [TAGS.shifts, TAGS.timesheets, TAGS.auditLog],
  cancelShift: () => [TAGS.shifts, TAGS.timesheets, TAGS.auditLog],
  withdrawShift: () => [TAGS.shifts, TAGS.auditLog],
  uploadCredential: (nurseId: string) => [TAGS.credentials(nurseId), TAGS.auditLog],
  approveTimesheet: () => [TAGS.timesheets, TAGS.auditLog],
  readNotification: () => [TAGS.auditLog],
} satisfies Record<string, (...args: string[]) => string[]>;

/** For route handlers (updateTag only works in Server Actions): expire immediately. */
export function expireTags(tags: readonly string[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
