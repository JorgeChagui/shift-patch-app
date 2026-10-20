import { EmptyState } from "@/components/empty-state";
import { CancelShiftForm } from "@/components/shift/cancel-shift-form";
import { ShiftStatusBadge } from "@/components/shift/shift-status-badge";
import { ShiftTimeStrip } from "@/components/shift/shift-time-strip";
import { ShiftTimes } from "@/components/shift/shift-times";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminShiftDto } from "@/lib/dto";
import { listShiftBoard } from "@/lib/data/shifts";
import { formatShiftDate } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { WithdrawShiftForm } from "./withdraw-shift-form";

function ShiftActions({ shift }: { shift: AdminShiftDto }) {
  if (shift.status === "filled") return <CancelShiftForm shiftId={shift.id} chooseReason />;
  if (shift.status === "open") return <WithdrawShiftForm shiftId={shift.id} />;
  return <span className="text-ink-muted">No actions</span>;
}

/** The agency's own shifts with status and covering nurse. */
export async function AgencyShiftTable() {
  const session = await requireSession("agency");
  const shifts = (await listShiftBoard()).filter((shift) => shift.agencyId === session.agencyId);

  if (shifts.length === 0) {
    return <EmptyState title="No shifts posted yet">Use Post shift to add your first open shift.</EmptyState>;
  }
  return (
    <div className="rounded-lg border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shift</TableHead>
            <TableHead className="hidden md:table-cell">Time of day</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Nurse</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id} data-shift-id={shift.id}>
              <TableCell>
                <p className="font-bold">{shift.role}</p>
                <p className="text-ink-muted">
                  {formatShiftDate(shift.date)}, <ShiftTimes startTime={shift.startTime} endTime={shift.endTime} />
                </p>
              </TableCell>
              <TableCell className="hidden w-48 md:table-cell">
                <ShiftTimeStrip startTime={shift.startTime} endTime={shift.endTime} status={shift.status} />
              </TableCell>
              <TableCell>
                <ShiftStatusBadge status={shift.status} />
              </TableCell>
              <TableCell>{shift.claimedByName ?? <span className="text-ink-muted">Not yet covered</span>}</TableCell>
              <TableCell>
                <ShiftActions shift={shift} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
