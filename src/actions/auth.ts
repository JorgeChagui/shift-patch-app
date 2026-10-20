"use server";

import { updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionError, type ActionState } from "@/lib/action-state";
import { ROLE_HOME, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { MUTATION_TAGS } from "@/lib/cache-tags";
import { clientIp } from "@/lib/http";
import { safeNext } from "@/lib/redirect";
import { authenticate, revokeSession } from "@/lib/services/auth";
import { formatZodError, loginSchema } from "@/lib/validation";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return actionError(formatZodError(parsed.error));

  const result = await authenticate(parsed.data, { ip: clientIp(await headers()) });
  // Failed logins are audited too, so always expire.
  for (const tag of MUTATION_TAGS.login()) updateTag(tag);
  if (!result.ok) return actionError(result.error);

  const { token, session } = result.data;
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  // proxy.ts bounces a `next` that belongs to another role to this role's home.
  redirect(safeNext(formData.get("next")) ?? ROLE_HOME[session.role]);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await revokeSession(token);
    for (const tag of MUTATION_TAGS.login()) updateTag(tag);
  }
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
