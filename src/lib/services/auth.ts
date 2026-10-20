import "server-only";
import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/audit";
import { signToken, type Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ServiceResult } from "@/lib/result";
import type { LoginInput } from "@/lib/validation";

export const INVALID_LOGIN_MESSAGE = "Invalid email or password";
// Compared against when the email is unknown, so both failures take about as long.
const DUMMY_HASH = "$2b$10$8/pLYbne6L3lUjwCfZgN9OkPo3Y3aSG5d0JM38D13Ir23XK35yvyC";

/** Checks the credentials and signs a session token. */
export async function authenticate(input: LoginInput): Promise<ServiceResult<{ token: string; session: Session }>> {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return fail(401, INVALID_LOGIN_MESSAGE);

  const session: Session = { userId: user.id, role: user.role, name: user.name, agencyId: user.agencyId };
  const token = await signToken(session);
  await writeAudit(db, { actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id });
  return ok({ token, session });
}
