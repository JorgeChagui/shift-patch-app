import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** A label, its control, and an optional hint, stacked. */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
