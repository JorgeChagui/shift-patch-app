"use client";

import type { ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type ActionFormProps = {
  /** A Server Action built with defineAction (passed down from a Server Component). */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Sent as hidden inputs, e.g. { id: shift.id }. */
  fields: Record<string, string>;
  children: ReactNode;
  className?: string;
};

/** A small form for one-click mutations (claim, cancel, withdraw, approve) with banner feedback. */
export function ActionForm({ action, fields, children, className }: ActionFormProps) {
  const [, formAction] = useActionFeedback(action);
  return (
    <form action={formAction} className={cn("flex flex-wrap items-center gap-2", className)}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
    </form>
  );
}
