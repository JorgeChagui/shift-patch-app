import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/client";
import { ROLE_HOME, SESSION_COOKIE, verifyToken, type Session } from "@/lib/auth";

/** The session from the cookie, for Server Components and Server Actions (memoised per request). */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifyToken(token) : null;
});

/**
 * Defense in depth behind proxy.ts: no session → /login, wrong role → that role's home.
 * Pass no roles to accept any signed-in user.
 */
export async function requireSession(...roles: Role[]): Promise<Session> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (roles.length > 0 && !roles.includes(session.role)) redirect(ROLE_HOME[session.role]);
  return session;
}
