import type { ShiftStatus } from "@/generated/prisma/enums";
import { STATUS_TONE } from "@/lib/format";
import { isOvernight } from "@/lib/time";
import { cn } from "@/lib/utils";

const DAY_MINUTES = 24 * 60;

function toPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m) / DAY_MINUTES) * 100;
}

type Segment = { left: number; width: number; nextDay: boolean };

/** Where the shift sits on a 00:00–24:00 track. Overnight shifts wrap: the part after midnight is hatched. */
function segments(startTime: string, endTime: string): Segment[] {
  const start = toPercent(startTime);
  const end = toPercent(endTime);
  if (!isOvernight(startTime, endTime)) return [{ left: start, width: end - start, nextDay: false }];
  return [
    { left: start, width: 100 - start, nextDay: false },
    { left: 0, width: end, nextDay: true },
  ];
}

/**
 * A 24-hour bar showing when the shift runs, coloured by status. Decorative: the times are
 * always printed next to it, so it's hidden from screen readers.
 */
export function ShiftTimeStrip({
  startTime,
  endTime,
  status,
  className,
}: {
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  className?: string;
}) {
  const bar = STATUS_TONE[status].bar;
  return (
    <div aria-hidden className={cn("w-full max-w-56", className)}>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        {[25, 50, 75].map((tick) => (
          <span key={tick} className="absolute inset-y-0 w-px bg-line" style={{ left: `${tick}%` }} />
        ))}
        {segments(startTime, endTime).map((segment) => (
          <span
            key={segment.left}
            className={cn("absolute inset-y-0", bar, segment.nextDay && "strip-next-day")}
            style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.6875rem] leading-none text-ink-muted tabular">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}
