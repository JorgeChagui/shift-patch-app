import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, parseWith } from "@/lib/http";
import { idParamsSchema } from "@/lib/validation";

/** The owning agency or an admin approves a pending timesheet. */
export async function POST(request: Request, ctx: RouteContext<"/api/timesheets/[id]/approve">) {
  const session = await requireRole(request, "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { id } = params.data;

  const timesheet = await db.timesheet.findUnique({
    where: { id },
    include: { shift: { select: { agencyId: true } } },
  });
  if (!timesheet) return jsonError(404, "Timesheet not found");
  if (session.role === "agency" && timesheet.shift.agencyId !== session.agencyId) {
    return jsonError(403, "Forbidden");
  }
  if (timesheet.status === "approved") return jsonError(409, "Timesheet is already approved");

  const approved = await db.$transaction(async (tx) => {
    const { count } = await tx.timesheet.updateMany({
      where: { id, status: "pending" },
      data: { status: "approved", approvedById: session.userId, approvedAt: new Date() },
    });
    if (count === 0) return null;
    await writeAudit(tx, {
      actorId: session.userId,
      action: "timesheet.approved",
      entityType: "timesheet",
      entityId: id,
      metadata: { shiftId: timesheet.shiftId, nurseId: timesheet.nurseId },
    });
    return tx.timesheet.findUniqueOrThrow({ where: { id } });
  });

  if (!approved) return jsonError(409, "Timesheet is already approved");
  return Response.json({
    id: approved.id,
    shiftId: approved.shiftId,
    nurseId: approved.nurseId,
    hours: approved.hours,
    status: approved.status,
    approvedAt: approved.approvedAt?.toISOString() ?? null,
  });
}
