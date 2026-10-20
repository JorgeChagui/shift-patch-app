import "server-only";
import { writeAudit } from "@/lib/audit";
import type { Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ServiceResult } from "@/lib/result";

/** Marks one of the caller's own notifications as read (idempotent). */
export async function markNotificationRead(
  actor: Session,
  id: string,
): Promise<ServiceResult<{ id: string; readAt: string | null }>> {
  const notification = await db.notification.findFirst({ where: { id, userId: actor.userId } });
  if (!notification) return fail(404, "Notification not found");

  const readAt =
    notification.readAt ??
    (await db.$transaction(async (tx) => {
      const updated = await tx.notification.update({ where: { id }, data: { readAt: new Date() } });
      await writeAudit(tx, {
        actorId: actor.userId,
        action: "notification.read",
        entityType: "notification",
        entityId: id,
      });
      return updated.readAt;
    }));

  return ok({ id, readAt: readAt?.toISOString() ?? null });
}
