import type { Prisma, ShiftStatus } from "@/generated/prisma/client";
import type { DbClient } from "@/lib/db";

/** Include this when loading shifts so `toShiftDto` has the agency name. */
export const shiftInclude = {
  agency: { select: { name: true } },
} satisfies Prisma.ShiftInclude;

export type ShiftWithAgency = Prisma.ShiftGetPayload<{
  include: typeof shiftInclude;
}>;

export type ShiftDto = {
  id: string;
  agencyId: string;
  agencyName: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  claimedBy: string | null;
};

/** The one shift shape every route returns, keys in spec order. */
export function toShiftDto(shift: ShiftWithAgency): ShiftDto {
  return {
    id: shift.id,
    agencyId: shift.agencyId,
    agencyName: shift.agency.name,
    role: shift.role,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    status: shift.status,
    claimedBy: shift.claimedById ?? null,
  };
}

/** Next "shift-<n>" ID from the shift_id_seq sequence (safe under concurrency). */
export async function nextShiftId(client: DbClient): Promise<string> {
  const [{ n }] = await client.$queryRaw<
    { n: bigint }[]
  >`SELECT nextval('shift_id_seq') AS n`;
  return `shift-${n}`;
}
