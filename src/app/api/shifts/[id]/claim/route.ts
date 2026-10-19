import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { CREDENTIAL_EXPIRED_MESSAGE, canClaim } from "@/lib/credentials";
import { db } from "@/lib/db";
import { jsonError, parseWith } from "@/lib/http";
import { shiftInclude, toShiftDto } from "@/lib/shifts";
import { shiftHours } from "@/lib/time";
import { idParamsSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/claim">) {
  const session = await requireRole(request, "nurse");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { id } = params.data;

  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return jsonError(404, "Shift not found");

  if (!(await canClaim(db, session.userId, shift.date))) {
    await writeAudit(db, {
      actorId: session.userId,
      action: "shift.claim_blocked",
      entityType: "shift",
      entityId: id,
      metadata: { reason: "credential-expired" },
    });
    return jsonError(403, CREDENTIAL_EXPIRED_MESSAGE);
  }

  if (shift.status !== "open") return jsonError(409, "Shift is not open");

  const claimed = await db.$transaction(async (tx) => {
    // Conditional update: of two simultaneous claims, only one sees count 1.
    const { count } = await tx.shift.updateMany({
      where: { id, status: "open" },
      data: { status: "filled", claimedById: session.userId },
    });
    if (count === 0) return null;

    await tx.timesheet.create({
      data: { shiftId: id, nurseId: session.userId, hours: shiftHours(shift.startTime, shift.endTime) },
    });
    await tx.notification.create({
      data: {
        userId: session.userId,
        kind: "success",
        message: `Shift claimed: ${shift.role} on ${shift.date}, ${shift.startTime}-${shift.endTime}`,
      },
    });
    await writeAudit(tx, {
      actorId: session.userId,
      action: "shift.claimed",
      entityType: "shift",
      entityId: id,
    });
    return tx.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude });
  });

  if (!claimed) return jsonError(409, "Shift is not open");
  return Response.json(toShiftDto(claimed));
}
