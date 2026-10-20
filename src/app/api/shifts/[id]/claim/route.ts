import { requireRole } from "@/lib/auth";
import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { parseWith, resultResponse } from "@/lib/http";
import { claimShift } from "@/lib/services/shifts";
import { idParamsSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/claim">) {
  const session = await requireRole(request, "nurse");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;

  const result = await claimShift(session, params.data.id);
  expireTags(MUTATION_TAGS.claimShift());
  return resultResponse(result);
}
