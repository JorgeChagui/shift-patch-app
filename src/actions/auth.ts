"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { actionError, type ActionState } from "@/lib/action-state";
import { ROLE_HOME, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { MUTATION_TAGS } from "@/lib/cache-tags";
import { authenticate } from "@/lib/services/auth";
import { formatZodError, loginSchema } from "@/lib/validation";

/** Only same-site paths, so `?next=` can't send the user to another origin. */
function safeNext(next: FormDataEntryValue | null): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return actionError(formatZodError(parsed.error));

  const result = await authenticate(parsed.data);
  if (!result.ok) return actionError(result.error);

  const { token, session } = result.data;
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  for (const tag of MUTATION_TAGS.login()) updateTag(tag);
  // proxy.ts bounces a `next` that belongs to another role to this role's home.
  redirect(safeNext(formData.get("next")) ?? ROLE_HOME[session.role]);
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
