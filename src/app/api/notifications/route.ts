import { requireRole } from "@/lib/auth";
import { listNotifications } from "@/lib/data/notifications";

/** The signed-in user's notifications, unread first, then newest first. */
export async function GET(request: Request) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;
  return Response.json({ notifications: await listNotifications(session.userId) });
}
