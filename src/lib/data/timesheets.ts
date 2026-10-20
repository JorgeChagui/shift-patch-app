import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma, Role } from "@/generated/prisma/client";
import { TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { timesheetInclude, toTimesheetDto, type TimesheetDto } from "@/lib/dto";

/** Whose timesheets to list: derive it from the session, then pass it in (it is the cache key). */
export type TimesheetScope = { role: Role; userId: string; agencyId: string | null };

function scopeWhere({ role, userId, agencyId }: TimesheetScope): Prisma.TimesheetWhereInput {
  if (role === "nurse") return { nurseId: userId };
  if (role === "agency") return { shift: { agencyId: agencyId ?? "" } };
  return {};
}

/** Timesheets scoped by role: nurse → own, agency → its shifts, admin → all. */
export async function listTimesheets(scope: TimesheetScope): Promise<TimesheetDto[]> {
  "use cache";
  cacheLife("marketplace");
  cacheTag(TAGS.timesheets);

  const timesheets = await db.timesheet.findMany({
    where: scopeWhere(scope),
    include: timesheetInclude,
    orderBy: [{ shift: { date: "asc" } }, { shift: { startTime: "asc" } }],
  });
  return timesheets.map(toTimesheetDto);
}
