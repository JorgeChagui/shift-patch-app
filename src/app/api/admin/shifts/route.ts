import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { shiftOrder, toShiftDto } from "@/lib/shifts";

/** Admin reporting: counts by status and every shift with its agency and covering nurse. */
export async function GET(request: Request) {
  const session = await requireRole(request, "admin");
  if (session instanceof Response) return session;

  const shifts = await db.shift.findMany({
    include: { agency: { select: { name: true } }, claimedBy: { select: { name: true } } },
    orderBy: shiftOrder,
  });

  const counts = { open: 0, filled: 0, cancelled: 0, total: shifts.length };
  for (const shift of shifts) counts[shift.status] += 1;

  return Response.json({
    counts,
    shifts: shifts.map((shift) => ({
      ...toShiftDto(shift),
      claimedByName: shift.claimedBy?.name ?? null,
    })),
  });
}
