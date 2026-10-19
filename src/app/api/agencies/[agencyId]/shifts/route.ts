import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, parseWith } from "@/lib/http";
import { shiftInclude, shiftOrder, toShiftDto } from "@/lib/shifts";
import { agencyParamsSchema } from "@/lib/validation";

/** An agency's own shifts (decision 6: other agencies get 403, admins can read any). */
export async function GET(request: Request, ctx: RouteContext<"/api/agencies/[agencyId]/shifts">) {
  const session = await requireRole(request, "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(agencyParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { agencyId } = params.data;

  if (session.role === "agency" && session.agencyId !== agencyId) return jsonError(403, "Forbidden");

  const agency = await db.agency.findUnique({ where: { id: agencyId }, select: { id: true } });
  if (!agency) return jsonError(404, "Agency not found");

  const shifts = await db.shift.findMany({
    where: { agencyId },
    include: shiftInclude,
    orderBy: shiftOrder,
  });
  return Response.json({ agencyId, shifts: shifts.map(toShiftDto) });
}
