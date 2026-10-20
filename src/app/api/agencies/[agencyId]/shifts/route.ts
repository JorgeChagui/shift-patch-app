import { requireRole } from "@/lib/auth";
import { listAgencyShifts } from "@/lib/data/shifts";
import { jsonError, parseWith } from "@/lib/http";
import { agencyParamsSchema } from "@/lib/validation";

/** An agency's own shifts (decision 6: other agencies get 403, admins can read any). */
export async function GET(request: Request, ctx: RouteContext<"/api/agencies/[agencyId]/shifts">) {
  const session = await requireRole(request, "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(agencyParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { agencyId } = params.data;

  if (session.role === "agency" && session.agencyId !== agencyId) return jsonError(403, "Forbidden");

  const shifts = await listAgencyShifts(agencyId);
  if (!shifts) return jsonError(404, "Agency not found");
  return Response.json({ agencyId, shifts });
}
