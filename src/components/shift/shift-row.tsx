import type { ReactNode } from "react";
import type { ShiftDto } from "@/lib/dto";
import { ShiftStatusBadge } from "./shift-status-badge";
import { ShiftSummary } from "./shift-summary";
import { ShiftTimeStrip } from "./shift-time-strip";

/** One shift as a list row: summary, 24h strip, status, and an optional action. */
export function ShiftRow({ shift, action, testId }: { shift: ShiftDto; action?: ReactNode; testId?: string }) {
  return (
    <li
      data-testid={testId}
      data-shift-id={shift.id}
      className="grid gap-3 rounded-lg border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center sm:gap-6"
    >
      <ShiftSummary shift={shift} />
      <ShiftTimeStrip startTime={shift.startTime} endTime={shift.endTime} status={shift.status} />
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <ShiftStatusBadge status={shift.status} />
        {action}
      </div>
    </li>
  );
}

export function ShiftList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}
