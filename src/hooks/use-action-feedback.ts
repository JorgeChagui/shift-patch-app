"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { useNotify } from "@/hooks/use-notify";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * useActionState for a Server Action, plus the banner: every result is shown in the
 * notification banner, and `onSuccess` runs after a successful submission (close a dialog,
 * reset a form).
 */
export function useActionFeedback(action: FormAction, onSuccess?: () => void) {
  const { notify } = useNotify();
  return useActionState(async (prev: ActionState, formData: FormData) => {
    const state = await action(prev, formData);
    if (state.status !== "idle") notify(state.status, state.message);
    if (state.status === "success") onSuccess?.();
    return state;
  }, IDLE_ACTION_STATE);
}
