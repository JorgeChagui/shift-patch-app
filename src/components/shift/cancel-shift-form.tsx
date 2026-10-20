import { cancelShiftAction } from "@/actions/shifts";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

/**
 * Cancels a filled shift (it reopens). Nurses can only cancel in advance, so they get no reason
 * choice; agencies and admins pick no-show or advance.
 */
export function CancelShiftForm({ shiftId, chooseReason = false }: { shiftId: string; chooseReason?: boolean }) {
  return (
    <ActionForm action={cancelShiftAction} fields={chooseReason ? { id: shiftId } : { id: shiftId, reason: "advance" }}>
      {chooseReason && (
        <NativeSelect name="reason" aria-label="Cancellation reason" defaultValue="no-show" size="sm">
          <NativeSelectOption value="no-show">Nurse didn&apos;t show</NativeSelectOption>
          <NativeSelectOption value="advance">Cancelled in advance</NativeSelectOption>
        </NativeSelect>
      )}
      <SubmitButton variant="outline" size="sm" data-testid="shift-cancel-button">
        Cancel shift
      </SubmitButton>
    </ActionForm>
  );
}
