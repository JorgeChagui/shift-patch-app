import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/http";
import { nextShiftId, shiftInclude, shiftOrder, toShiftDto } from "@/lib/shifts";
import { shiftCreateSchema } from "@/lib/validation";

/** The marketplace: every shift across all agencies (any signed-in role, decision 3). */
export async function GET(request: Request) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;

  const shifts = await db.shift.findMany({ include: shiftInclude, orderBy: shiftOrder });
  return Response.json({ shifts: shifts.map(toShiftDto) });
}

/** An agency posts an open shift, always under its own agencyId. */
export async function POST(request: Request) {
  const session = await requireRole(request, "agency");
  if (session instanceof Response) return session;
  if (!session.agencyId) return jsonError(403, "Forbidden");
  const agencyId = session.agencyId;

  const body = await parseBody(shiftCreateSchema, request);
  if (body.error) return body.error;

  const shift = await db.$transaction(async (tx) => {
    const created = await tx.shift.create({
      data: { id: await nextShiftId(tx), agencyId, ...body.data },
      include: shiftInclude,
    });
    await writeAudit(tx, {
      actorId: session.userId,
      action: "shift.created",
      entityType: "shift",
      entityId: created.id,
      metadata: { ...body.data, agencyId },
    });
    return created;
  });

  return Response.json(toShiftDto(shift), { status: 201 });
}
