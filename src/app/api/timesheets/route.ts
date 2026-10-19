import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { shiftInclude, toShiftDto } from "@/lib/shifts";

/** Timesheets scoped by role: nurse → own, agency → its shifts, admin → all. */
export async function GET(request: Request) {
  const session = await requireRole(request, "nurse", "agency", "admin");
  if (session instanceof Response) return session;

  const where: Prisma.TimesheetWhereInput =
    session.role === "nurse"
      ? { nurseId: session.userId }
      : session.role === "agency"
        ? { shift: { agencyId: session.agencyId ?? "" } }
        : {};

  const timesheets = await db.timesheet.findMany({
    where,
    include: { shift: { include: shiftInclude }, nurse: { select: { name: true } } },
    orderBy: [{ shift: { date: "asc" } }, { shift: { startTime: "asc" } }],
  });

  return Response.json({
    timesheets: timesheets.map((t) => ({
      id: t.id,
      shiftId: t.shiftId,
      shift: toShiftDto(t.shift),
      nurseId: t.nurseId,
      nurseName: t.nurse.name,
      hours: t.hours,
      status: t.status,
      approvedAt: t.approvedAt?.toISOString() ?? null,
    })),
  });
}
