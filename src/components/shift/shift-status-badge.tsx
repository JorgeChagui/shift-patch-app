import type { ShiftStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The status as text in a tinted pill. `testId` is set where a test needs it (admin table). */
export function ShiftStatusBadge({ status, testId }: { status: ShiftStatus; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-sm font-medium ring-1 ring-inset",
        STATUS_TONE[status].badge,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
