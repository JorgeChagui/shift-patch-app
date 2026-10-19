import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { SESSION_COOKIE, getSession, requireRole, signToken, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { EMAILS, latestAudit, req, resetDb } from "./helpers";

beforeAll(resetDb);
afterAll(() => db.$disconnect());

const maria = { userId: "nurse-1", role: "nurse", name: "Maria Lopez", agencyId: null } as const;

describe("tokens", () => {
  it("round-trips a valid token", async () => {
    expect(await verifyToken(await signToken(maria))).toEqual(maria);
  });

  it("rejects an expired token", async () => {
    expect(await verifyToken(await signToken(maria, -10))).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const [header, , signature] = (await signToken(maria)).split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin-1", role: "admin", name: "x" })).toString("base64url");
    expect(await verifyToken(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await new SignJWT({ role: "admin", name: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin-1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("some-other-secret"));
    expect(await verifyToken(token)).toBeNull();
  });
});

describe("getSession / requireRole", () => {
  it("prefers the Authorization header over the cookie", async () => {
    const admin = await signToken({ userId: "admin-1", role: "admin", name: "Alex Kim", agencyId: null });
    const nurse = await signToken(maria);
    const session = await getSession(req("/", {
      token: admin,
      headers: { cookie: `${SESSION_COOKIE}=${nurse}` },
    }));
    expect(session?.userId).toBe("admin-1");
  });

  it("falls back to the cookie", async () => {
    const nurse = await signToken(maria);
    const session = await getSession(req("/", { headers: { cookie: `other=1; ${SESSION_COOKIE}=${nurse}` } }));
    expect(session?.userId).toBe("nurse-1");
  });

  it("returns 401 without a session and 403 for the wrong role", async () => {
    const none = await requireRole(req("/"), "admin");
    expect(none).toBeInstanceOf(Response);
    expect((none as Response).status).toBe(401);

    const wrong = await requireRole(req("/", { token: await signToken(maria) }), "admin");
    expect((wrong as Response).status).toBe(403);
    expect(await (wrong as Response).json()).toEqual({ error: "Forbidden" });
  });
});

describe("POST /api/auth/login", () => {
  const cases = [
    ["maria", { id: "nurse-1", name: "Maria Lopez", role: "nurse" }],
    ["james", { id: "nurse-2", name: "James Cook", role: "nurse" }],
    ["agencyA", { id: "agency-a-admin", name: "Sunrise Health Staffing", role: "agency" }],
    ["agencyB", { id: "agency-b-admin", name: "Metro Care Partners", role: "agency" }],
    ["admin", { id: "admin-1", name: "Alex Kim", role: "admin" }],
  ] as const;

  it.each(cases)("logs in %s with the spec shape", async (account, user) => {
    const res = await login(req("/api/auth/login", {
      method: "POST",
      body: { email: EMAILS[account], password: "Trial2026!" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toStrictEqual({ token: expect.any(String), user });
    expect(Object.keys(body)).toEqual(["token", "user"]);
    expect(Object.keys(body.user)).toEqual(["id", "name", "role"]);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=${body.token}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    expect(await latestAudit()).toMatchObject({ action: "auth.login", actorId: user.id, entityId: user.id });
  });

  it("returns the same 401 for a wrong password and an unknown email", async () => {
    for (const body of [
      { email: EMAILS.maria, password: "wrong" },
      { email: "nobody@example.com", password: "Trial2026!" },
    ]) {
      const res = await login(req("/api/auth/login", { method: "POST", body }));
      expect(res.status).toBe(401);
      expect(await res.json()).toStrictEqual({ error: "Invalid email or password" });
    }
  });

  it("returns 400 for a missing field or invalid JSON", async () => {
    const missing = await login(req("/api/auth/login", { method: "POST", body: { email: EMAILS.maria } }));
    expect(missing.status).toBe(400);
    expect(await missing.json()).toHaveProperty("error");

    const broken = await login(new Request("http://localhost/api/auth/login", { method: "POST", body: "{" }));
    expect(broken.status).toBe(400);
  });
});

describe("logout and me", () => {
  it("me returns the current user, or 401", async () => {
    const token = await signToken(maria);
    const res = await me(req("/api/auth/me", { token }));
    expect(await res.json()).toEqual({
      user: { id: "nurse-1", name: "Maria Lopez", role: "nurse", agencyId: null },
    });
    expect((await me(req("/api/auth/me"))).status).toBe(401);
  });

  it("logout clears the cookie", () => {
    const cookie = logout().headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=;`);
    expect(cookie).toContain("Max-Age=0");
  });
});
