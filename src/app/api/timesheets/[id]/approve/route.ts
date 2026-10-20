import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { parseWith, resultResponse } from "@/lib/http";
import { approveTimesheet } from "@/lib/services/timesheets";
import { requireRole } from "@/lib/session";
import { idParamsSchema } from "@/lib/validation";

/** The owning agency or an admin approves a pending timesheet. */
export async function POST(request: Request, ctx: RouteContext<"/api/timesheets/[id]/approve">) {
  const session = await requireRole(request, "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;

  const result = await approveTimesheet(session, params.data.id);
  expireTags(MUTATION_TAGS.approveTimesheet());
  return resultResponse(result);
}
