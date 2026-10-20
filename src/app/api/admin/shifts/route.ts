import { requireRole } from "@/lib/auth";
import { getAdminShifts } from "@/lib/data/shifts";

/** Admin reporting: counts by status and every shift with its agency and covering nurse. */
export async function GET(request: Request) {
  const session = await requireRole(request, "admin");
  if (session instanceof Response) return session;
  return Response.json(await getAdminShifts());
}
