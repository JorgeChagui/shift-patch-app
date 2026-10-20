import "server-only";
import { writeAudit } from "@/lib/audit";
import type { Session } from "@/lib/auth";
import { CREDENTIAL_EXPIRED_MESSAGE, canClaim } from "@/lib/credentials";
import { db } from "@/lib/db";
import { cancellationReasonFromApi, type ApiCancellationReason } from "@/lib/enums";
import { fail, ok, type ServiceResult } from "@/lib/result";
import { nextShiftId, shiftInclude, toShiftDto, type ShiftDto } from "@/lib/shifts";
import { shiftHours } from "@/lib/time";
import type { ShiftCreateInput } from "@/lib/validation";

// Shift lifecycle rules. Callers gate by role (requireRole / defineAction); these functions
// enforce ownership and state, and write the audit trail.

/** An agency posts an open shift, always under its own agencyId. */
export async function createShift(actor: Session, input: ShiftCreateInput): Promise<ServiceResult<ShiftDto>> {
  if (!actor.agencyId) return fail(403, "Forbidden");
  const agencyId = actor.agencyId;

  const shift = await db.$transaction(async (tx) => {
    const created = await tx.shift.create({
      data: { id: await nextShiftId(tx), agencyId, ...input },
      include: shiftInclude,
    });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "shift.created",
      entityType: "shift",
      entityId: created.id,
      metadata: { ...input, agencyId },
    });
    return created;
  });

  return ok(toShiftDto(shift));
}

/** A nurse claims an open shift, if their latest license covers the shift date (decision 2). */
export async function claimShift(actor: Session, id: string): Promise<ServiceResult<ShiftDto>> {
  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return fail(404, "Shift not found");

  if (!(await canClaim(db, actor.userId, shift.date))) {
    await writeAudit(db, {
      actorId: actor.userId,
      action: "shift.claim_blocked",
      entityType: "shift",
      entityId: id,
      metadata: { reason: "credential-expired" },
    });
    return fail(403, CREDENTIAL_EXPIRED_MESSAGE);
  }

  if (shift.status !== "open") return fail(409, "Shift is not open");

  const claimed = await db.$transaction(async (tx) => {
    // Conditional update: of two simultaneous claims, only one sees count 1.
    const { count } = await tx.shift.updateMany({
      where: { id, status: "open" },
      data: { status: "filled", claimedById: actor.userId },
    });
    if (count === 0) return null;

    await tx.timesheet.create({
      data: { shiftId: id, nurseId: actor.userId, hours: shiftHours(shift.startTime, shift.endTime) },
    });
    await tx.notification.create({
      data: {
        userId: actor.userId,
        kind: "success",
        message: `Shift claimed: ${shift.role} on ${shift.date}, ${shift.startTime}-${shift.endTime}`,
      },
    });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "shift.claimed",
      entityType: "shift",
      entityId: id,
    });
    return tx.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude });
  });

  if (!claimed) return fail(409, "Shift is not open");
  return ok(toShiftDto(claimed));
}

export type CancelledShiftDto = ShiftDto & {
  cancellation: { reason: ApiCancellationReason; previousNurseId: string };
};

/**
 * Cancellation / no-show: reopens a filled shift. Allowed for the owning agency, an admin,
 * or the nurse who claimed it (nurses only with reason "advance"), per decision 4.
 */
export async function cancelShift(
  actor: Session,
  id: string,
  reason: ApiCancellationReason,
): Promise<ServiceResult<CancelledShiftDto>> {
  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return fail(404, "Shift not found");

  if (actor.role === "agency" && shift.agencyId !== actor.agencyId) return fail(403, "Forbidden");
  if (actor.role === "nurse") {
    if (shift.claimedById !== actor.userId) return fail(403, "Forbidden");
    if (reason !== "advance") return fail(403, "Nurses can only cancel in advance");
  }

  if (shift.status !== "filled" || !shift.claimedById) return fail(409, "Shift is not filled");
  const previousNurseId = shift.claimedById;

  const reopened = await db.$transaction(async (tx) => {
    const { count } = await tx.shift.updateMany({
      where: { id, status: "filled", claimedById: previousNurseId },
      data: { status: "open", claimedById: null },
    });
    if (count === 0) return null;

    await tx.shiftCancellation.create({
      data: {
        shiftId: id,
        reason: cancellationReasonFromApi[reason],
        previousNurseId,
        cancelledById: actor.userId,
      },
    });
    // Decision 9: the timesheet goes with the claim, so a later claim can create a fresh one.
    await tx.timesheet.deleteMany({ where: { shiftId: id } });
    await tx.notification.create({
      data: {
        userId: previousNurseId,
        kind: "info",
        message: `Shift cancelled (${reason}): ${shift.role} on ${shift.date}, ${shift.startTime}-${shift.endTime}`,
      },
    });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "shift.cancelled",
      entityType: "shift",
      entityId: id,
      metadata: { reason, previousNurseId },
    });
    return tx.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude });
  });

  if (!reopened) return fail(409, "Shift is not filled");
  return ok({ ...toShiftDto(reopened), cancellation: { reason, previousNurseId } });
}

/** Decision 5: the owning agency (or an admin) takes an open shift off the market for good. */
export async function withdrawShift(actor: Session, id: string): Promise<ServiceResult<ShiftDto>> {
  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return fail(404, "Shift not found");
  if (actor.role === "agency" && shift.agencyId !== actor.agencyId) return fail(403, "Forbidden");
  if (shift.status !== "open") return fail(409, "Only open shifts can be withdrawn");

  const withdrawn = await db.$transaction(async (tx) => {
    const { count } = await tx.shift.updateMany({
      where: { id, status: "open" },
      data: { status: "cancelled" },
    });
    if (count === 0) return null;
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "shift.withdrawn",
      entityType: "shift",
      entityId: id,
    });
    return tx.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude });
  });

  if (!withdrawn) return fail(409, "Only open shifts can be withdrawn");
  return ok(toShiftDto(withdrawn));
}
