import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import type { AdminShiftDto, AdminShiftsDto } from "@/lib/dto";
import { shiftInclude, shiftOrder, toShiftDto, type ShiftDto } from "@/lib/shifts";

// Cached shift reads, shared by pages and route handlers. Arguments are plain IDs (never
// cookies), so one cache entry serves every user; mutations expire TAGS.shifts.

/** The marketplace: every shift across all agencies. */
export async function listShifts(): Promise<ShiftDto[]> {
  "use cache";
  cacheLife("marketplace");
  cacheTag(TAGS.shifts);

  const shifts = await db.shift.findMany({ include: shiftInclude, orderBy: shiftOrder });
  return shifts.map(toShiftDto);
}

/** One agency's shifts, or null if the agency doesn't exist. */
export async function listAgencyShifts(agencyId: string): Promise<ShiftDto[] | null> {
  "use cache";
  cacheLife("marketplace");
  cacheTag(TAGS.shifts);

  const agency = await db.agency.findUnique({
    where: { id: agencyId },
    select: { shifts: { include: shiftInclude, orderBy: shiftOrder } },
  });
  return agency ? agency.shifts.map(toShiftDto) : null;
}

/** Every shift with its covering nurse's name: the admin dashboard and the agency's own list. */
export async function listShiftBoard(): Promise<AdminShiftDto[]> {
  "use cache";
  cacheLife("marketplace");
  cacheTag(TAGS.shifts);

  const shifts = await db.shift.findMany({
    include: { agency: { select: { name: true } }, claimedBy: { select: { name: true } } },
    orderBy: shiftOrder,
  });
  return shifts.map((shift) => ({ ...toShiftDto(shift), claimedByName: shift.claimedBy?.name ?? null }));
}

/** Admin reporting: counts by status plus the shift board. */
export async function getAdminShifts(): Promise<AdminShiftsDto> {
  const shifts = await listShiftBoard();
  const counts = { open: 0, filled: 0, cancelled: 0, total: shifts.length };
  for (const shift of shifts) counts[shift.status] += 1;
  return { counts, shifts };
}
