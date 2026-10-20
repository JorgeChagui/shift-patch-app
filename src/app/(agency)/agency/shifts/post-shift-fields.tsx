import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";

const ROLE_SUGGESTIONS = ["RN", "LPN", "CNA"];

/** Role, date, start and end: the fields of shiftCreateSchema. */
export function PostShiftFields() {
  return (
    <>
      <Field id="shift-role" label="Role" hint="For example RN, LPN or CNA.">
        <Input id="shift-role" name="role" required maxLength={50} list="shift-role-options" autoComplete="off" />
        <datalist id="shift-role-options">
          {ROLE_SUGGESTIONS.map((role) => (
            <option key={role} value={role} />
          ))}
        </datalist>
      </Field>
      <Field id="shift-date" label="Date">
        <Input id="shift-date" name="date" type="date" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="shift-start" label="Starts">
          <Input id="shift-start" name="startTime" type="time" required />
        </Field>
        <Field id="shift-end" label="Ends">
          <Input id="shift-end" name="endTime" type="time" required />
        </Field>
      </div>
    </>
  );
}
