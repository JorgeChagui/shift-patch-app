import { ShiftStatusBadge } from "@/components/shift/shift-status-badge";
import { ShiftTimes } from "@/components/shift/shift-times";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminShiftDto } from "@/lib/dto";
import { formatShiftDate } from "@/lib/format";

/** Every shift, one row each (`admin-dashboard-shift-table`). */
export function AdminShiftTable({ shifts }: { shifts: AdminShiftDto[] }) {
  return (
    <div className="rounded-lg border bg-surface">
      <Table data-testid="admin-dashboard-shift-table">
        <TableHeader>
          <TableRow>
            <TableHead>Agency</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Date and time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Nurse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-ink-muted">
                No shifts yet. They appear here as soon as an agency posts one.
              </TableCell>
            </TableRow>
          )}
          {shifts.map((shift) => (
            <TableRow key={shift.id} data-shift-id={shift.id}>
              <TableCell>{shift.agencyName}</TableCell>
              <TableCell className="font-bold">{shift.role}</TableCell>
              <TableCell>
                {formatShiftDate(shift.date)}
                <br />
                <span className="text-ink-muted">
                  <ShiftTimes startTime={shift.startTime} endTime={shift.endTime} />
                </span>
              </TableCell>
              <TableCell>
                <ShiftStatusBadge status={shift.status} testId="admin-shift-status-badge" />
              </TableCell>
              <TableCell>{shift.claimedByName ?? <span className="text-ink-muted">Not covered</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
