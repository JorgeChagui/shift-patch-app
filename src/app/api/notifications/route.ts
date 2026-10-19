import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

/** The signed-in user's notifications, unread first, then newest first. */
export async function GET(request: Request) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;

  const notifications = await db.notification.findMany({
    where: { userId: session.userId },
    orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 50,
  });

  return Response.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      message: n.message,
      kind: n.kind,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
