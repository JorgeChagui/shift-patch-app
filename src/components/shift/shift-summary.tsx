import type { ShiftDto } from "@/lib/dto";
import { formatShiftDate } from "@/lib/format";
import { ShiftTimes } from "./shift-times";

/** Role and agency on top, date and times beneath: how a shift is introduced everywhere. */
export function ShiftSummary({ shift, showAgency = true }: { shift: ShiftDto; showAgency?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-ink">
        {shift.role}
        {showAgency && <span className="font-normal text-ink-muted"> at {shift.agencyName}</span>}
      </p>
      <p className="text-ink-muted">
        <time dateTime={shift.date}>{formatShiftDate(shift.date)}</time>
        <span aria-hidden>, </span>
        <ShiftTimes startTime={shift.startTime} endTime={shift.endTime} />
      </p>
    </div>
  );
}
