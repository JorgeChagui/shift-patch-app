import { Moon } from "lucide-react";
import { describeTimeRange, formatTimeRange } from "@/lib/format";
import { isOvernight } from "@/lib/time";

/** "19:00 – 07:00" with an overnight marker when the shift ends the next day. */
export function ShiftTimes({ startTime, endTime }: { startTime: string; endTime: string }) {
  const overnight = isOvernight(startTime, endTime);
  return (
    <span className="inline-flex items-center gap-1.5 tabular">
      <span aria-hidden>{formatTimeRange(startTime, endTime)}</span>
      <span className="sr-only">{describeTimeRange(startTime, endTime)}</span>
      {overnight && (
        <span className="inline-flex items-center gap-1 text-sm text-brand-ink" aria-hidden>
          <Moon className="size-3.5" />
          overnight
        </span>
      )}
    </span>
  );
}
