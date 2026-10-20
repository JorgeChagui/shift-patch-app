import { approveTimesheetAction } from "@/actions/timesheets";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { ShiftTimes } from "@/components/shift/shift-times";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TimesheetDto } from "@/lib/dto";
import { formatHours, formatShiftDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: TimesheetDto["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-sm font-medium",
        status === "approved" ? "bg-success-wash text-success-ink" : "bg-warning-wash text-warning-ink",
      )}
    >
      {status}
    </span>
  );
}

/** Timesheets with an approve action on pending rows (`timesheet-table`). */
export function TimesheetTable({ timesheets, showAgency }: { timesheets: TimesheetDto[]; showAgency: boolean }) {
  return (
    <div className="rounded-lg border bg-surface">
      <Table data-testid="timesheet-table">
        <TableHeader>
          <TableRow>
            <TableHead>Shift</TableHead>
            <TableHead>Nurse</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Approve</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timesheets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-ink-muted">
                No timesheets yet. One is created when a nurse claims a shift.
              </TableCell>
            </TableRow>
          )}
          {timesheets.map((timesheet) => (
            <TableRow key={timesheet.id}>
              <TableCell>
                <p className="font-bold">
                  {timesheet.shift.role}
                  {showAgency && <span className="font-normal text-ink-muted"> at {timesheet.shift.agencyName}</span>}
                </p>
                <p className="text-ink-muted">
                  <ShiftTimes startTime={timesheet.shift.startTime} endTime={timesheet.shift.endTime} />
                </p>
              </TableCell>
              <TableCell>{timesheet.nurseName}</TableCell>
              <TableCell>{formatShiftDate(timesheet.shift.date)}</TableCell>
              <TableCell className="text-right tabular">{formatHours(timesheet.hours)}</TableCell>
              <TableCell>
                <StatusPill status={timesheet.status} />
              </TableCell>
              <TableCell>
                {timesheet.status === "pending" ? (
                  <ActionForm action={approveTimesheetAction} fields={{ id: timesheet.id }}>
                    <SubmitButton size="sm">Approve</SubmitButton>
                  </ActionForm>
                ) : (
                  <span className="text-ink-muted">Approved</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
