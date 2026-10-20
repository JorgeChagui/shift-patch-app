import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { parseWith, resultResponse } from "@/lib/http";
import { withdrawShift } from "@/lib/services/shifts";
import { requireRole } from "@/lib/session";
import { idParamsSchema } from "@/lib/validation";

/** Decision 5: the owning agency (or an admin) takes an open shift off the market for good. */
export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/withdraw">) {
  const session = await requireRole(request, "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;

  const result = await withdrawShift(session, params.data.id);
  expireTags(MUTATION_TAGS.withdrawShift());
  return resultResponse(result);
}
