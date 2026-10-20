import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/client";

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

const ISSUER = "shiftpatch";
const AUDIENCE = "shiftpatch";
const MIN_SECRET_LENGTH = 32;

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set (see .env.example)");
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  return new TextEncoder().encode(value);
}

/** A verified token: the session plus what revocation needs (cross-phase decision 13). */
export type TokenClaims = { session: Session; jti: string; expiresAt: Date };

export function signToken(session: Session, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  return new SignJWT({ role: session.role, name: session.name, agencyId: session.agencyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setJti(crypto.randomUUID())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secret());
}

/** The claims of a valid token, or null if it is expired, tampered or malformed. Not revocation-aware. */
export async function verifyTokenClaims(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ["jti", "exp", "sub"],
    });
    const role = payload.role as Role;
    if (!payload.sub || !payload.jti || !payload.exp) return null;
    if (!ROLES.includes(role) || typeof payload.name !== "string") return null;
    return {
      session: {
        userId: payload.sub,
        role,
        name: payload.name,
        agencyId: typeof payload.agencyId === "string" ? payload.agencyId : null,
      },
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

/** Returns the session for a valid token, or null. Signature and expiry only: see src/lib/session.ts for revocation. */
export async function verifyToken(token: string): Promise<Session | null> {
  return (await verifyTokenClaims(token))?.session ?? null;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(rest.join("="));
    } catch {
      return null; // malformed percent-encoding: treat as no cookie, never a 500
    }
  }
  return null;
}

export type RequestToken = { token: string; source: "bearer" | "cookie" };

/** The request's token: `Authorization: Bearer <token>` first, then the session cookie. */
export function requestToken(request: Request): RequestToken | null {
  const auth = request.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return { token: bearer, source: "bearer" };
  const cookie = readCookie(request, SESSION_COOKIE);
  return cookie ? { token: cookie, source: "cookie" } : null;
}

/**
 * The request's session from the token alone (no DB), for src/proxy.ts. Route handlers use
 * `requireRole` from src/lib/session.ts, which also checks revocation and CSRF.
 */
export async function getSession(request: Request): Promise<Session | null> {
  const found = requestToken(request);
  return found ? verifyToken(found.token) : null;
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
