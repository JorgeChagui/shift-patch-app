import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, parseWith } from "@/lib/http";
import { shiftInclude, toShiftDto } from "@/lib/shifts";
import { idParamsSchema } from "@/lib/validation";

/** Decision 5: the owning agency (or an admin) takes an open shift off the market for good. */
export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/withdraw">) {
  const session = await requireRole(request, "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { id } = params.data;

  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return jsonError(404, "Shift not found");
  if (session.role === "agency" && shift.agencyId !== session.agencyId) {
    return jsonError(403, "Forbidden");
  }
  if (shift.status !== "open") return jsonError(409, "Only open shifts can be withdrawn");

  const withdrawn = await db.$transaction(async (tx) => {
    const { count } = await tx.shift.updateMany({
      where: { id, status: "open" },
      data: { status: "cancelled" },
    });
    if (count === 0) return null;
    await writeAudit(tx, {
      actorId: session.userId,
      action: "shift.withdrawn",
      entityType: "shift",
      entityId: id,
    });
    return tx.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude });
  });

  if (!withdrawn) return jsonError(409, "Only open shifts can be withdrawn");
  return Response.json(toShiftDto(withdrawn));
}
