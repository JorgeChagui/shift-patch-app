import "server-only";
import { updateTag } from "next/cache";
import type { z } from "zod";
import type { Role } from "@/generated/prisma/client";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import type { Session } from "@/lib/auth";
import type { ServiceResult } from "@/lib/result";
import { getServerSession } from "@/lib/session";
import { formatZodError } from "@/lib/validation";

type ActionConfig<S extends z.ZodType, T> = {
  /** Roles allowed to run the action (checked server-side on every call). */
  roles: Role[];
  /** Validates the form fields (FormData entries as a plain object). */
  schema: S;
  run: (session: Session, input: z.infer<S>, formData: FormData) => Promise<ServiceResult<T>>;
  /** Cache tags to expire after the call (see MUTATION_TAGS). */
  tags: (session: Session) => string[];
  /** Banner text on success. */
  success: string;
};

/**
 * Builds a form Server Action around a service: role check, zod parsing, the service call,
 * cache invalidation, and the banner message. Error text passes through from the service,
 * so the UI shows exactly what the API would ("Credential expired, cannot claim shift").
 */
export function defineAction<S extends z.ZodType, T>(config: ActionConfig<S, T>) {
  return async function action(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const session = await getServerSession();
    if (!session) return actionError("Unauthorized");
    if (!config.roles.includes(session.role)) return actionError("Forbidden");

    const parsed = config.schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return actionError(formatZodError(parsed.error));

    const result = await config.run(session, parsed.data, formData);
    // Some failures also write (e.g. the audit row for a blocked claim), so always expire.
    for (const tag of config.tags(session)) updateTag(tag);

    return result.ok ? actionSuccess(config.success) : actionError(result.error);
  };
}
