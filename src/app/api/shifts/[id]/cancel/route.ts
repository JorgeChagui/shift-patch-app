import { requireRole } from "@/lib/auth";
import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { parseBody, parseWith, resultResponse } from "@/lib/http";
import { cancelShift } from "@/lib/services/shifts";
import { cancelSchema, idParamsSchema } from "@/lib/validation";

/** Cancellation / no-show: reopens a filled shift (rules in cancelShift, decision 4). */
export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/cancel">) {
  const session = await requireRole(request, "nurse", "agency", "admin");
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;

  const body = await parseBody(cancelSchema, request);
  if (body.error) return body.error;

  const result = await cancelShift(session, params.data.id, body.data.reason);
  expireTags(MUTATION_TAGS.cancelShift());
  return resultResponse(result);
}
