import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/audit";
import { signToken, type Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, type ServiceResult } from "@/lib/result";
import { revokeToken } from "@/lib/session";
import type { LoginInput } from "@/lib/validation";

export const INVALID_LOGIN_MESSAGE = "Invalid email or password";
export const TOO_MANY_ATTEMPTS_MESSAGE = "Too many login attempts, try again later";
// Compared against when the email is unknown, so both failures take about as long. Same cost
// as the seeded hashes (10); a random secret, made once per instance, so nothing is hardcoded.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomBytes(32).toString("hex"), 10));

// Cross-phase decision 12: failed logins only, in a rolling window.
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 20;

/** True once this email or IP has used up its failed attempts for the window. */
async function isThrottled(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { email, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
  ]);
  return byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP;
}

/** Records a failed login (throttle row + audit entry) and prunes rows past the window. */
async function recordFailure(email: string, ip: string, userId: string | null): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.loginAttempt.create({ data: { email, ip } });
    await tx.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - LOGIN_WINDOW_MS) } } });
    await writeAudit(tx, {
      actorId: userId,
      action: "auth.login_failed",
      entityType: "user",
      entityId: userId ?? "unknown",
      metadata: { email, ip },
    });
  });
}

/** Checks the credentials (throttled per email and IP) and signs a session token. */
export async function authenticate(
  input: LoginInput,
  { ip }: { ip: string },
): Promise<ServiceResult<{ token: string; session: Session }>> {
  if (await isThrottled(input.email, ip)) return fail(429, TOO_MANY_ATTEMPTS_MESSAGE);

  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await recordFailure(input.email, ip, user?.id ?? null);
    return fail(401, INVALID_LOGIN_MESSAGE);
  }

  const session: Session = { userId: user.id, role: user.role, name: user.name, agencyId: user.agencyId };
  const token = await signToken(session);
  await writeAudit(db, { actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id });
  return ok({ token, session });
}

/** Logout: revokes the token so it can't be replayed (decision 13), and records it. */
export async function revokeSession(token: string): Promise<void> {
  const session = await revokeToken(token);
  if (session) {
    await writeAudit(db, { actorId: session.userId, action: "auth.logout", entityType: "user", entityId: session.userId });
  }
}
