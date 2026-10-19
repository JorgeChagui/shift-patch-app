import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancellationReasonFromApi } from "@/lib/enums";
import { jsonError, parseBody, parseWith } from "@/lib/http";
import { shiftInclude, toShiftDto } from "@/lib/shifts";
import { cancelSchema, idParamsSchema } from "@/lib/validation";

/**
 * Cancellation / no-show: reopens a filled shift. Allowed for the owning agency, an admin,
 * or the nurse who claimed it (nurses only with reason "advance"), per decision 4.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/cancel">) {
  const session = await requireRole(request, "nurse", "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { id } = params.data;

  const body = await parseBody(cancelSchema, request);
  if (body.error) return body.error;
  const { reason } = body.data;

  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return jsonError(404, "Shift not found");

  if (session.role === "agency" && shift.agencyId !== session.agencyId) {
    return jsonError(403, "Forbidden");
  }
  if (session.role === "nurse") {
    if (shift.claimedById !== session.userId) return jsonError(403, "Forbidden");
    if (reason !== "advance") return jsonError(403, "Nurses can only cancel in advance");
  }

  if (shift.status !== "filled" || !shift.claimedById) return jsonError(409, "Shift is not filled");
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
        cancelledById: session.userId,
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
      actorId: session.userId,
      action: "shift.cancelled",
      entityType: "shift",
      entityId: id,
      metadata: { reason, previousNurseId },
    });
    return tx.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude });
  });

  if (!reopened) return jsonError(409, "Shift is not filled");
  return Response.json({ ...toShiftDto(reopened), cancellation: { reason, previousNurseId } });
}
