import type { Role } from "@/generated/prisma/enums";
import { listTimesheets } from "@/lib/data/timesheets";
import { requireSession } from "@/lib/session";
import { TimesheetTable } from "./timesheet-table";

/** Loads the timesheets the signed-in role may see (agency: its shifts; admin: all). */
export async function TimesheetsSection({ role }: { role: Extract<Role, "agency" | "admin"> }) {
  const { userId, agencyId } = await requireSession(role);
  const timesheets = await listTimesheets({ role, userId, agencyId });
  return <TimesheetTable timesheets={timesheets} showAgency={role === "admin"} />;
}
