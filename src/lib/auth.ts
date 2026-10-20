import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/client";
import { jsonError } from "@/lib/http";

// Shared by route handlers and src/proxy.ts, so this file must not import the db client.

export const SESSION_COOKIE = "shiftpatch_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export const ROLES = ["nurse", "agency", "admin"] as const satisfies readonly Role[];

/** Where each role lands after login (and where proxy.ts sends a wrong-role visitor). */
export const ROLE_HOME: Record<Role, string> = {
  nurse: "/shifts",
  agency: "/agency/shifts",
  admin: "/admin",
};

export type Session = {
  userId: string;
  role: Role;
  name: string;
  agencyId: string | null;
};

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set (see .env.example)");
  return new TextEncoder().encode(value);
}

export function signToken(session: Session, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  return new SignJWT({ role: session.role, name: session.name, agencyId: session.agencyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secret());
}

/** Returns the session for a valid token, or null if it is expired, tampered or malformed. */
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role) || typeof payload.name !== "string") return null;
    return {
      userId: payload.sub,
      role,
      name: payload.name,
      agencyId: typeof payload.agencyId === "string" ? payload.agencyId : null,
    };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Reads `Authorization: Bearer <token>` first, then the session cookie. */
export async function getSession(request: Request): Promise<Session | null> {
  const auth = request.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? readCookie(request, SESSION_COOKIE);
  return token ? verifyToken(token) : null;
}

/** Returns the session, or a ready 401 (no/invalid token) or 403 (wrong role) response. */
export async function requireRole(
  request: Request,
  ...roles: Role[]
): Promise<Session | Response> {
  const session = await getSession(request);
  if (!session) return jsonError(401, "Unauthorized");
  if (roles.length > 0 && !roles.includes(session.role)) return jsonError(403, "Forbidden");
  return session;
}

/** Cookie attributes for the session, shared by the API's Set-Cookie and Server Actions' cookies(). */
export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  } as const;
}

export function sessionCookie(token: string, maxAge = SESSION_TTL_SECONDS): string {
  const options = sessionCookieOptions(maxAge);
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    `Path=${options.path}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAge}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return sessionCookie("", 0);
}
