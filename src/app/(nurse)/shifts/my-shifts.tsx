import { EmptyState } from "@/components/empty-state";
import { CancelShiftForm } from "@/components/shift/cancel-shift-form";
import { ShiftList, ShiftRow } from "@/components/shift/shift-row";
import { listShifts } from "@/lib/data/shifts";
import { requireSession } from "@/lib/session";

/** The nurse's claimed (filled) shifts, each cancellable in advance. */
export async function MyShifts() {
  const session = await requireSession("nurse");
  const shifts = (await listShifts()).filter(
    (shift) => shift.status === "filled" && shift.claimedBy === session.userId,
  );

  if (shifts.length === 0) {
    return <EmptyState title="You haven't claimed any shifts">Claim one from the open shifts above.</EmptyState>;
  }
  return (
    <ShiftList>
      {shifts.map((shift) => (
        <ShiftRow key={shift.id} shift={shift} action={<CancelShiftForm shiftId={shift.id} />} />
      ))}
    </ShiftList>
  );
}
