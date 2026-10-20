import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/client";
import { ROLE_HOME, SESSION_COOKIE, requestToken, verifyTokenClaims, type Session, type TokenClaims } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

// The DB-aware half of auth: revocation (cross-phase decision 13) and CSRF (decision 14).
// src/proxy.ts stays on the token alone (src/lib/auth.ts); pages and handlers re-check here.

/** A valid token that logout hasn't revoked, or null. */
async function activeClaims(token: string): Promise<TokenClaims | null> {
  const claims = await verifyTokenClaims(token);
  if (!claims) return null;
  const revoked = await db.revokedToken.findUnique({ where: { jti: claims.jti }, select: { jti: true } });
  return revoked ? null : claims;
}

/** Revokes a token until it would have expired (logout). Invalid tokens are ignored. */
export async function revokeToken(token: string): Promise<Session | null> {
  const claims = await verifyTokenClaims(token);
  if (!claims) return null;
  await db.$transaction([
    db.revokedToken.upsert({
      where: { jti: claims.jti },
      create: { jti: claims.jti, expiresAt: claims.expiresAt },
      update: {},
    }),
    // Expired tokens fail verification anyway, so their rows can go.
    db.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  return claims.session;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** True when the browser says the request came from this site (Sec-Fetch-Site, else Origin vs Host). */
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * For route handlers. Returns the session, or a ready response: 401 (no, invalid or revoked
 * token), 403 (wrong role, or a cross-site state change riding on the session cookie).
 * Pass no roles to accept any signed-in user.
 */
export async function requireRole(request: Request, ...roles: Role[]): Promise<Session | Response> {
  const found = requestToken(request);
  const claims = found ? await activeClaims(found.token) : null;
  if (!found || !claims) return jsonError(401, "Unauthorized");
  // Bearer tokens are never sent by the browser on its own, so only the cookie needs this.
  if (found.source === "cookie" && !SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return jsonError(403, "Forbidden");
  }
  const { session } = claims;
  if (roles.length > 0 && !roles.includes(session.role)) return jsonError(403, "Forbidden");
  return session;
}

/** The session from the cookie, for Server Components and Server Actions (memoised per request). */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? ((await activeClaims(token))?.session ?? null) : null;
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
