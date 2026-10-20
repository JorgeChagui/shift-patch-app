import type { ShiftStatus } from "@/generated/prisma/enums";
import type { AdminShiftsDto } from "@/lib/dto";
import { STATUS_TONE } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER: { status: ShiftStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "filled", label: "Filled" },
  { status: "cancelled", label: "Cancelled" },
];

/** A coverage bar split by status, with the count for each underneath. */
export function StatusCounts({ counts }: { counts: AdminShiftsDto["counts"] }) {
  return (
    <div className="w-full max-w-xl space-y-3">
      <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-muted">
        {ORDER.map(({ status }) =>
          counts[status] > 0 ? (
            <span
              key={status}
              className={cn("h-full transition-[width] duration-500", STATUS_TONE[status].bar)}
              style={{ width: `${(counts[status] / Math.max(counts.total, 1)) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {ORDER.map(({ status, label }) => (
          <div key={status} className="rounded-lg border bg-surface px-3 py-2">
            <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
              <span aria-hidden className={cn("size-2 rounded-full", STATUS_TONE[status].bar)} />
              {label}
            </dt>
            <dd className="text-2xl font-bold text-ink tabular">{counts[status]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink-muted">
        {counts.total} {counts.total === 1 ? "shift" : "shifts"} in total
      </p>
    </div>
  );
}
