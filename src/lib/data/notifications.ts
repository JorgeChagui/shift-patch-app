import "server-only";
import { db } from "@/lib/db";
import { toNotificationDto, type NotificationDto } from "@/lib/dto";

/** The user's notifications, unread first, then newest first. Not cached: per-user and rarely read. */
export async function listNotifications(userId: string): Promise<NotificationDto[]> {
  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 50,
  });
  return notifications.map(toNotificationDto);
}
