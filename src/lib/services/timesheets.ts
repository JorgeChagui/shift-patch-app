import "server-only";
import type { Timesheet } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import type { Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ServiceResult } from "@/lib/result";

export type ApprovedTimesheetDto = Pick<Timesheet, "id" | "shiftId" | "nurseId" | "hours" | "status"> & {
  approvedAt: string | null;
};

/** The owning agency or an admin approves a pending timesheet. */
export async function approveTimesheet(
  actor: Session,
  id: string,
): Promise<ServiceResult<ApprovedTimesheetDto>> {
  const timesheet = await db.timesheet.findUnique({
    where: { id },
    include: { shift: { select: { agencyId: true } } },
  });
  if (!timesheet) return fail(404, "Timesheet not found");
  if (actor.role === "agency" && timesheet.shift.agencyId !== actor.agencyId) return fail(403, "Forbidden");
  if (timesheet.status === "approved") return fail(409, "Timesheet is already approved");

  const approved = await db.$transaction(async (tx) => {
    const { count } = await tx.timesheet.updateMany({
      where: { id, status: "pending" },
      data: { status: "approved", approvedById: actor.userId, approvedAt: new Date() },
    });
    if (count === 0) return null;
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "timesheet.approved",
      entityType: "timesheet",
      entityId: id,
      metadata: { shiftId: timesheet.shiftId, nurseId: timesheet.nurseId },
    });
    return tx.timesheet.findUniqueOrThrow({ where: { id } });
  });

  if (!approved) return fail(409, "Timesheet is already approved");
  return ok({
    id: approved.id,
    shiftId: approved.shiftId,
    nurseId: approved.nurseId,
    hours: approved.hours,
    status: approved.status,
    approvedAt: approved.approvedAt?.toISOString() ?? null,
  });
}
