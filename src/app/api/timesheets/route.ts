import { listTimesheets } from "@/lib/data/timesheets";
import { requireRole } from "@/lib/session";

/** Timesheets scoped by role: nurse → own, agency → its shifts, admin → all. */
export async function GET(request: Request) {
  const session = await requireRole(request, "nurse", "agency", "admin");
  if (session instanceof Response) return session;

  const { role, userId, agencyId } = session;
  return Response.json({ timesheets: await listTimesheets({ role, userId, agencyId }) });
}
