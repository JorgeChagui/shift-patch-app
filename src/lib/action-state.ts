// What every Server Action returns to its form. `nonce` changes on each submission, so the
// client shows the banner again even when the same message repeats.

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  nonce: number;
};

export const IDLE_ACTION_STATE: ActionState = { status: "idle", message: "", nonce: 0 };

export function actionSuccess(message: string): ActionState {
  return { status: "success", message, nonce: Date.now() };
}

export function actionError(message: string): ActionState {
  return { status: "error", message, nonce: Date.now() };
}
