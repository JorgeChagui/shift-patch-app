import { withdrawShiftAction } from "@/actions/shifts";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";

/** Takes an open shift off the market for good (status becomes cancelled). */
export function WithdrawShiftForm({ shiftId }: { shiftId: string }) {
  return (
    <ActionForm action={withdrawShiftAction} fields={{ id: shiftId }}>
      <SubmitButton variant="outline" size="sm">
        Withdraw
      </SubmitButton>
    </ActionForm>
  );
}
