import { claimShiftAction } from "@/actions/shifts";
import { EmptyState } from "@/components/empty-state";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { ShiftList, ShiftRow } from "@/components/shift/shift-row";
import { listShifts } from "@/lib/data/shifts";
import { requireSession } from "@/lib/session";

export async function OpenShifts() {
  await requireSession("nurse");
  const shifts = (await listShifts()).filter((shift) => shift.status === "open");

  if (shifts.length === 0) {
    return <EmptyState title="No open shifts right now">New shifts show up here as soon as an agency posts them.</EmptyState>;
  }
  return (
    <ShiftList>
      {shifts.map((shift) => (
        <ShiftRow
          key={shift.id}
          shift={shift}
          testId="shift-list-item"
          action={
            <ActionForm action={claimShiftAction} fields={{ id: shift.id }}>
              <SubmitButton data-testid="shift-claim-button">Claim shift</SubmitButton>
            </ActionForm>
          }
        />
      ))}
    </ShiftList>
  );
}
