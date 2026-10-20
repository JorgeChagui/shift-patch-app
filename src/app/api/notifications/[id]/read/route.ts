import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { parseWith, resultResponse } from "@/lib/http";
import { markNotificationRead } from "@/lib/services/notifications";
import { requireRole } from "@/lib/session";
import { idParamsSchema } from "@/lib/validation";

/** Marks one of the caller's own notifications as read (idempotent). */
export async function POST(request: Request, ctx: RouteContext<"/api/notifications/[id]/read">) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;

  const result = await markNotificationRead(session, params.data.id);
  expireTags(MUTATION_TAGS.readNotification());
  return resultResponse(result);
}
