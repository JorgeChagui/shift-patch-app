import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, parseWith } from "@/lib/http";
import { idParamsSchema } from "@/lib/validation";

/** Marks one of the caller's own notifications as read (idempotent). */
export async function POST(request: Request, ctx: RouteContext<"/api/notifications/[id]/read">) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;

  const params = parseWith(idParamsSchema, await ctx.params);
  if (params.error) return params.error;
  const { id } = params.data;

  const notification = await db.notification.findFirst({ where: { id, userId: session.userId } });
  if (!notification) return jsonError(404, "Notification not found");

  const readAt =
    notification.readAt ??
    (await db.$transaction(async (tx) => {
      const updated = await tx.notification.update({ where: { id }, data: { readAt: new Date() } });
      await writeAudit(tx, {
        actorId: session.userId,
        action: "notification.read",
        entityType: "notification",
        entityId: id,
      });
      return updated.readAt;
    }));

  return Response.json({ id, readAt: readAt?.toISOString() ?? null });
}
